import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface JournalLineInput {
  accountId: string
  description?: string
  debitSen: number
  creditSen: number
}

export interface CreateJournalEntryDto {
  date: string
  description: string
  reference?: string
  sourceType?: 'INVOICE' | 'PAYMENT' | 'PAYROLL' | 'MANUAL'
  sourceId?: string
  lines: JournalLineInput[]
}

@Injectable()
export class JournalsService {
  private readonly logger = new Logger(JournalsService.name)

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantSchema: string, status?: string) {
    const statusFilter = status ? `AND je.status = '${status}'` : ''
    return this.prisma.$queryRawUnsafe(
      `SELECT je.id, je.entry_no, je.date, je.description, je.reference,
              je.source_type, je.source_id, je.status, je.posted_at,
              je.created_at,
              COALESCE(SUM(jl.debit_sen), 0)::bigint AS total_debit_sen,
              COALESCE(SUM(jl.credit_sen), 0)::bigint AS total_credit_sen
       FROM "${tenantSchema}".journal_entries je
       LEFT JOIN "${tenantSchema}".journal_lines jl ON jl.journal_entry_id = je.id
       WHERE je.deleted_at IS NULL ${statusFilter}
       GROUP BY je.id
       ORDER BY je.date DESC, je.created_at DESC`,
    )
  }

  async findOne(tenantSchema: string, id: string) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT je.*
       FROM "${tenantSchema}".journal_entries je
       WHERE je.id = $1::uuid AND je.deleted_at IS NULL`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Journal entry not found')

    const lines = await this.prisma.$queryRawUnsafe(
      `SELECT jl.id, jl.journal_entry_id, jl.account_id, jl.description,
              jl.debit_sen, jl.credit_sen, jl.currency, jl.exchange_rate,
              jl.created_at,
              a.code AS account_code, a.name AS account_name
       FROM "${tenantSchema}".journal_lines jl
       JOIN "${tenantSchema}".accounts a ON a.id = jl.account_id
       WHERE jl.journal_entry_id = $1::uuid
       ORDER BY jl.created_at ASC`,
      id,
    )

    return { ...rows[0], lines }
  }

  async create(tenantSchema: string, dto: CreateJournalEntryDto, userId: string) {
    if (!dto.lines || dto.lines.length < 2) {
      throw new BadRequestException('Journal entry must have at least 2 lines')
    }

    // Validate each line has debit or credit but not both
    for (const line of dto.lines) {
      if (line.debitSen > 0 && line.creditSen > 0) {
        throw new BadRequestException('A journal line cannot have both debit and credit amounts')
      }
      if (line.debitSen === 0 && line.creditSen === 0) {
        throw new BadRequestException('A journal line must have either a debit or credit amount')
      }
      if (line.debitSen < 0 || line.creditSen < 0) {
        throw new BadRequestException('Debit and credit amounts cannot be negative')
      }
    }

    // Validate balanced: total debits = total credits
    const totalDebit = dto.lines.reduce((sum, l) => sum + l.debitSen, 0)
    const totalCredit = dto.lines.reduce((sum, l) => sum + l.creditSen, 0)
    if (totalDebit !== totalCredit) {
      throw new BadRequestException(
        `Journal entry is not balanced. Total debit: ${totalDebit}, total credit: ${totalCredit}`,
      )
    }

    // Check period lock
    await this.checkPeriodLock(tenantSchema, dto.date)

    return await this.prisma.$transaction(async (tx) => {
      // Generate entry number: JV-YYYYMM-XXXXX
      const period = dto.date.substring(0, 7).replace('-', '')
      const countRows = await tx.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) AS cnt FROM "${tenantSchema}".journal_entries
         WHERE entry_no LIKE $1 AND deleted_at IS NULL`,
        `JV-${period}-%`,
      )
      const count = Number(countRows[0]?.cnt ?? 0) + 1
      const entryNo = `JV-${period}-${String(count).padStart(5, '0')}`

      // Create journal entry
      const entryRows = await tx.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "${tenantSchema}".journal_entries
           (entry_no, date, description, reference, source_type, source_id, status, created_by, updated_by)
         VALUES ($1, $2::date, $3, $4, $5, $6::uuid, 'DRAFT', $7::uuid, $7::uuid)
         RETURNING id`,
        entryNo, dto.date, dto.description, dto.reference ?? null,
        dto.sourceType ?? 'MANUAL', dto.sourceId ?? null, userId,
      )
      const entryId = entryRows[0].id

      // Create journal lines
      for (const line of dto.lines) {
        await tx.$queryRawUnsafe(
          `INSERT INTO "${tenantSchema}".journal_lines
             (journal_entry_id, account_id, description, debit_sen, credit_sen)
           VALUES ($1::uuid, $2::uuid, $3, $4, $5)`,
          entryId, line.accountId, line.description ?? null,
          line.debitSen, line.creditSen,
        )
      }

      return { id: entryId, entryNo, totalDebit, totalCredit }
    })
  }

  async post(tenantSchema: string, id: string, userId: string) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: string; status: string; date: string }[]>(
      `SELECT id, status, date::text FROM "${tenantSchema}".journal_entries
       WHERE id = $1::uuid AND deleted_at IS NULL`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Journal entry not found')
    if (rows[0].status !== 'DRAFT') {
      throw new BadRequestException(`Cannot post journal entry with status '${rows[0].status}'. Only DRAFT entries can be posted.`)
    }

    // Check period lock
    await this.checkPeriodLock(tenantSchema, rows[0].date)

    await this.prisma.$queryRawUnsafe(
      `UPDATE "${tenantSchema}".journal_entries
       SET status = 'POSTED', posted_at = NOW(), posted_by = $1::uuid, updated_at = NOW(), updated_by = $1::uuid
       WHERE id = $2::uuid`,
      userId, id,
    )

    return this.findOne(tenantSchema, id)
  }

  async reverse(tenantSchema: string, id: string, userId: string) {
    const entry = await this.findOne(tenantSchema, id) as any
    if (entry.status !== 'POSTED') {
      throw new BadRequestException(`Cannot reverse journal entry with status '${entry.status}'. Only POSTED entries can be reversed.`)
    }

    // Check period lock for today (reversal date)
    const today = new Date().toISOString().split('T')[0]
    await this.checkPeriodLock(tenantSchema, today)

    return await this.prisma.$transaction(async (tx) => {
      // Set original entry to CANCELLED
      await tx.$queryRawUnsafe(
        `UPDATE "${tenantSchema}".journal_entries
         SET status = 'CANCELLED', updated_at = NOW(), updated_by = $1::uuid
         WHERE id = $2::uuid`,
        userId, id,
      )

      // Generate entry number for reversal
      const period = today.substring(0, 7).replace('-', '')
      const countRows = await tx.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) AS cnt FROM "${tenantSchema}".journal_entries
         WHERE entry_no LIKE $1 AND deleted_at IS NULL`,
        `JV-${period}-%`,
      )
      const count = Number(countRows[0]?.cnt ?? 0) + 1
      const reversalEntryNo = `JV-${period}-${String(count).padStart(5, '0')}`

      // Create reversing journal entry with swapped debits/credits
      const reversalRows = await tx.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "${tenantSchema}".journal_entries
           (entry_no, date, description, reference, source_type, source_id, status, created_by, updated_by)
         VALUES ($1, $2::date, $3, $4, 'MANUAL', $5::uuid, 'POSTED', $6::uuid, $6::uuid)
         RETURNING id`,
        reversalEntryNo, today,
        `Reversal of ${entry.entry_no}: ${entry.description}`,
        `REV-${entry.entry_no}`,
        id, userId,
      )
      const reversalId = reversalRows[0].id

      // Set posted_at for the reversal
      await tx.$queryRawUnsafe(
        `UPDATE "${tenantSchema}".journal_entries
         SET posted_at = NOW(), posted_by = $1::uuid
         WHERE id = $2::uuid`,
        userId, reversalId,
      )

      // Create reversed lines (swap debit and credit)
      for (const line of (entry.lines as any[])) {
        await tx.$queryRawUnsafe(
          `INSERT INTO "${tenantSchema}".journal_lines
             (journal_entry_id, account_id, description, debit_sen, credit_sen, currency, exchange_rate)
           VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)`,
          reversalId, line.account_id, line.description ?? null,
          line.credit_sen, line.debit_sen,
          line.currency ?? 'MYR', line.exchange_rate ?? 1,
        )
      }

      return { id: reversalId, entryNo: reversalEntryNo, reversedEntryId: id, reversedEntryNo: entry.entry_no }
    })
  }

  async delete(tenantSchema: string, id: string) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: string; status: string }[]>(
      `SELECT id, status FROM "${tenantSchema}".journal_entries
       WHERE id = $1::uuid AND deleted_at IS NULL`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Journal entry not found')
    if (rows[0].status !== 'DRAFT') {
      throw new BadRequestException(`Cannot delete journal entry with status '${rows[0].status}'. Only DRAFT entries can be deleted.`)
    }

    await this.prisma.$queryRawUnsafe(
      `UPDATE "${tenantSchema}".journal_entries
       SET deleted_at = NOW()
       WHERE id = $1::uuid`,
      id,
    )

    return { success: true, message: 'Journal entry deleted' }
  }

  private async checkPeriodLock(tenantSchema: string, date: string) {
    const period = date.substring(0, 7) // YYYY-MM
    const lockRows = await this.prisma.$queryRawUnsafe<{ lock_level: string }[]>(
      `SELECT lock_level FROM "${tenantSchema}".period_locks
       WHERE period = $1`,
      period,
    )
    if (lockRows.length > 0) {
      const lock = lockRows[0]
      throw new BadRequestException(
        `Period ${period} is locked (${lock.lock_level}). Cannot create or modify journal entries in this period.`,
      )
    }
  }
}
