import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

// ── DTOs ──────────────────────────────────────────────────────────────

export interface CreateBankAccountDto {
  name: string
  bankName: string
  accountNo: string
  accountType?: 'CURRENT' | 'SAVINGS'
  currency?: string
  ledgerAccountId?: string
  openingBalanceSen?: number
  isDefault?: boolean
}

export interface UpdateBankAccountDto {
  name?: string
  bankName?: string
  accountNo?: string
  accountType?: 'CURRENT' | 'SAVINGS'
  currency?: string
  ledgerAccountId?: string
  isDefault?: boolean
  isActive?: boolean
}

export interface CreateBankTransactionDto {
  bankAccountId: string
  date: string
  description: string
  reference?: string
  amountSen: number
  balanceSen?: number
}

export interface ImportBankTransactionRow {
  date: string
  description: string
  reference?: string
  amountSen: number
  balanceSen?: number
}

export interface StartReconSessionDto {
  bankAccountId: string
  periodStart: string
  periodEnd: string
  statementBalanceSen: number
}

// ── Service ───────────────────────────────────────────────────────────

@Injectable()
export class BankingService {
  private readonly logger = new Logger(BankingService.name)

  constructor(private readonly prisma: PrismaService) {}

  // ── Bank Accounts ─────────────────────────────────────────────────

  async findAllAccounts(tenantSchema: string) {
    return this.prisma.$queryRawUnsafe(
      `SELECT ba.id, ba.name, ba.bank_name, ba.account_no, ba.account_type,
              ba.currency, ba.ledger_account_id, ba.opening_balance_sen,
              ba.current_balance_sen, ba.is_default, ba.is_active,
              ba.created_at, ba.updated_at,
              a.name AS ledger_account_name, a.code AS ledger_account_code
       FROM "${tenantSchema}".bank_accounts ba
       LEFT JOIN "${tenantSchema}".accounts a ON a.id = ba.ledger_account_id
       WHERE ba.deleted_at IS NULL
       ORDER BY ba.is_default DESC, ba.name`,
    )
  }

  async findOneAccount(tenantSchema: string, id: string) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT ba.*, a.name AS ledger_account_name, a.code AS ledger_account_code
       FROM "${tenantSchema}".bank_accounts ba
       LEFT JOIN "${tenantSchema}".accounts a ON a.id = ba.ledger_account_id
       WHERE ba.id = $1::uuid AND ba.deleted_at IS NULL`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Bank account not found')
    return rows[0]
  }

  async createAccount(tenantSchema: string, dto: CreateBankAccountDto, userId: string) {
    const openingBalance = dto.openingBalanceSen ?? 0

    return await this.prisma.$transaction(async (tx) => {
      // If setting as default, unset previous default first
      if (dto.isDefault) {
        await tx.$queryRawUnsafe(
          `UPDATE "${tenantSchema}".bank_accounts SET is_default = FALSE WHERE is_default = TRUE AND deleted_at IS NULL`,
        )
      }

      const rows = await tx.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "${tenantSchema}".bank_accounts
           (name, bank_name, account_no, account_type, currency,
            ledger_account_id, opening_balance_sen, current_balance_sen,
            is_default, created_by)
         VALUES ($1, $2, $3, $4, $5, $6::uuid, $7, $7, $8, $9::uuid)
         RETURNING id`,
        dto.name,
        dto.bankName,
        dto.accountNo,
        dto.accountType ?? 'CURRENT',
        dto.currency ?? 'MYR',
        dto.ledgerAccountId ?? null,
        openingBalance,
        dto.isDefault ?? false,
        userId,
      )

      return rows[0]
    })
  }

  async updateAccount(tenantSchema: string, id: string, dto: UpdateBankAccountDto) {
    // Verify existence
    const existing = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${tenantSchema}".bank_accounts WHERE id = $1::uuid AND deleted_at IS NULL`,
      id,
    )
    if (!existing.length) throw new NotFoundException('Bank account not found')

    return await this.prisma.$transaction(async (tx) => {
      // If setting as default, unset previous default first
      if (dto.isDefault) {
        await tx.$queryRawUnsafe(
          `UPDATE "${tenantSchema}".bank_accounts SET is_default = FALSE WHERE is_default = TRUE AND deleted_at IS NULL`,
        )
      }

      // Build dynamic SET clause
      const sets: string[] = []
      const params: any[] = []
      let paramIdx = 1

      if (dto.name !== undefined) {
        sets.push(`name = $${paramIdx}`)
        params.push(dto.name)
        paramIdx++
      }
      if (dto.bankName !== undefined) {
        sets.push(`bank_name = $${paramIdx}`)
        params.push(dto.bankName)
        paramIdx++
      }
      if (dto.accountNo !== undefined) {
        sets.push(`account_no = $${paramIdx}`)
        params.push(dto.accountNo)
        paramIdx++
      }
      if (dto.accountType !== undefined) {
        sets.push(`account_type = $${paramIdx}`)
        params.push(dto.accountType)
        paramIdx++
      }
      if (dto.currency !== undefined) {
        sets.push(`currency = $${paramIdx}`)
        params.push(dto.currency)
        paramIdx++
      }
      if (dto.ledgerAccountId !== undefined) {
        sets.push(`ledger_account_id = $${paramIdx}::uuid`)
        params.push(dto.ledgerAccountId)
        paramIdx++
      }
      if (dto.isDefault !== undefined) {
        sets.push(`is_default = $${paramIdx}`)
        params.push(dto.isDefault)
        paramIdx++
      }
      if (dto.isActive !== undefined) {
        sets.push(`is_active = $${paramIdx}`)
        params.push(dto.isActive)
        paramIdx++
      }

      if (!sets.length) return this.findOneAccount(tenantSchema, id)

      sets.push('updated_at = NOW()')
      params.push(id)

      await tx.$queryRawUnsafe(
        `UPDATE "${tenantSchema}".bank_accounts SET ${sets.join(', ')} WHERE id = $${paramIdx}::uuid AND deleted_at IS NULL`,
        ...params,
      )

      return this.findOneAccount(tenantSchema, id)
    })
  }

  async deleteAccount(tenantSchema: string, id: string) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `UPDATE "${tenantSchema}".bank_accounts
       SET deleted_at = NOW(), is_active = FALSE, updated_at = NOW()
       WHERE id = $1::uuid AND deleted_at IS NULL
       RETURNING id`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Bank account not found')
    return { id, deleted: true }
  }

  // ── Bank Transactions ─────────────────────────────────────────────

  async getTransactions(tenantSchema: string, bankAccountId: string, startDate?: string, endDate?: string) {
    // Verify bank account exists
    const acctRows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${tenantSchema}".bank_accounts WHERE id = $1::uuid AND deleted_at IS NULL`,
      bankAccountId,
    )
    if (!acctRows.length) throw new NotFoundException('Bank account not found')

    let dateFilter = ''
    const params: any[] = [bankAccountId]
    let paramIdx = 2

    if (startDate) {
      dateFilter += ` AND bt.date >= $${paramIdx}::date`
      params.push(startDate)
      paramIdx++
    }
    if (endDate) {
      dateFilter += ` AND bt.date <= $${paramIdx}::date`
      params.push(endDate)
      paramIdx++
    }

    return this.prisma.$queryRawUnsafe(
      `SELECT bt.id, bt.bank_account_id, bt.date, bt.description, bt.reference,
              bt.amount_sen, bt.balance_sen, bt.source, bt.is_reconciled,
              bt.matched_payment_id, bt.reconciled_at, bt.created_at,
              p.payment_no AS matched_payment_no
       FROM "${tenantSchema}".bank_transactions bt
       LEFT JOIN "${tenantSchema}".payments p ON p.id = bt.matched_payment_id
       WHERE bt.bank_account_id = $1::uuid ${dateFilter}
       ORDER BY bt.date DESC, bt.created_at DESC`,
      ...params,
    )
  }

  async importTransactions(tenantSchema: string, bankAccountId: string, transactions: ImportBankTransactionRow[]) {
    // Verify bank account exists
    const acctRows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${tenantSchema}".bank_accounts WHERE id = $1::uuid AND deleted_at IS NULL`,
      bankAccountId,
    )
    if (!acctRows.length) throw new NotFoundException('Bank account not found')

    if (!transactions.length) {
      throw new BadRequestException('No transactions to import')
    }

    return await this.prisma.$transaction(async (tx) => {
      const imported: { id: string }[] = []

      for (const txn of transactions) {
        const rows = await tx.$queryRawUnsafe<{ id: string }[]>(
          `INSERT INTO "${tenantSchema}".bank_transactions
             (bank_account_id, date, description, reference, amount_sen, balance_sen, source)
           VALUES ($1::uuid, $2::date, $3, $4, $5, $6, 'IMPORT')
           RETURNING id`,
          bankAccountId,
          txn.date,
          txn.description,
          txn.reference ?? null,
          txn.amountSen,
          txn.balanceSen ?? null,
        )
        imported.push(rows[0])
      }

      // Update bank account current balance if the last transaction has a running balance
      const lastTxn = transactions[transactions.length - 1]
      if (lastTxn.balanceSen !== undefined && lastTxn.balanceSen !== null) {
        await tx.$queryRawUnsafe(
          `UPDATE "${tenantSchema}".bank_accounts
           SET current_balance_sen = $1, updated_at = NOW()
           WHERE id = $2::uuid`,
          lastTxn.balanceSen,
          bankAccountId,
        )
      }

      return { imported: imported.length, ids: imported.map((r) => r.id) }
    })
  }

  async createTransaction(tenantSchema: string, dto: CreateBankTransactionDto) {
    // Verify bank account exists
    const acctRows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${tenantSchema}".bank_accounts WHERE id = $1::uuid AND deleted_at IS NULL`,
      dto.bankAccountId,
    )
    if (!acctRows.length) throw new NotFoundException('Bank account not found')

    return await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "${tenantSchema}".bank_transactions
           (bank_account_id, date, description, reference, amount_sen, balance_sen, source)
         VALUES ($1::uuid, $2::date, $3, $4, $5, $6, 'MANUAL')
         RETURNING id`,
        dto.bankAccountId,
        dto.date,
        dto.description,
        dto.reference ?? null,
        dto.amountSen,
        dto.balanceSen ?? null,
      )

      // Update bank account running balance
      await tx.$queryRawUnsafe(
        `UPDATE "${tenantSchema}".bank_accounts
         SET current_balance_sen = current_balance_sen + $1, updated_at = NOW()
         WHERE id = $2::uuid`,
        dto.amountSen,
        dto.bankAccountId,
      )

      return rows[0]
    })
  }

  async matchTransaction(tenantSchema: string, txnId: string, paymentId: string) {
    // Verify bank transaction exists and is not already reconciled
    const txnRows = await this.prisma.$queryRawUnsafe<{ id: string; is_reconciled: boolean }[]>(
      `SELECT id, is_reconciled FROM "${tenantSchema}".bank_transactions WHERE id = $1::uuid`,
      txnId,
    )
    if (!txnRows.length) throw new NotFoundException('Bank transaction not found')
    if (txnRows[0].is_reconciled) throw new BadRequestException('Transaction is already reconciled')

    // Verify payment exists
    const paymentRows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${tenantSchema}".payments WHERE id = $1::uuid AND deleted_at IS NULL`,
      paymentId,
    )
    if (!paymentRows.length) throw new NotFoundException('Payment not found')

    await this.prisma.$queryRawUnsafe(
      `UPDATE "${tenantSchema}".bank_transactions
       SET matched_payment_id = $1::uuid, is_reconciled = TRUE, reconciled_at = NOW()
       WHERE id = $2::uuid`,
      paymentId,
      txnId,
    )

    return { id: txnId, matchedPaymentId: paymentId, reconciled: true }
  }

  async unmatchTransaction(tenantSchema: string, txnId: string) {
    const txnRows = await this.prisma.$queryRawUnsafe<{ id: string; is_reconciled: boolean }[]>(
      `SELECT id, is_reconciled FROM "${tenantSchema}".bank_transactions WHERE id = $1::uuid`,
      txnId,
    )
    if (!txnRows.length) throw new NotFoundException('Bank transaction not found')
    if (!txnRows[0].is_reconciled) throw new BadRequestException('Transaction is not reconciled')

    await this.prisma.$queryRawUnsafe(
      `UPDATE "${tenantSchema}".bank_transactions
       SET matched_payment_id = NULL, is_reconciled = FALSE, reconciled_at = NULL
       WHERE id = $1::uuid`,
      txnId,
    )

    return { id: txnId, reconciled: false }
  }

  // ── Reconciliation ────────────────────────────────────────────────

  async getUnreconciled(tenantSchema: string, bankAccountId: string) {
    // Verify bank account exists
    const acctRows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${tenantSchema}".bank_accounts WHERE id = $1::uuid AND deleted_at IS NULL`,
      bankAccountId,
    )
    if (!acctRows.length) throw new NotFoundException('Bank account not found')

    // Unreconciled bank transactions
    const unreconciledTransactions = await this.prisma.$queryRawUnsafe(
      `SELECT id, date, description, reference, amount_sen, balance_sen, source, created_at
       FROM "${tenantSchema}".bank_transactions
       WHERE bank_account_id = $1::uuid AND is_reconciled = FALSE
       ORDER BY date DESC`,
      bankAccountId,
    )

    // Unmatched payments (payments not yet linked to any bank transaction)
    const unmatchedPayments = await this.prisma.$queryRawUnsafe(
      `SELECT p.id, p.payment_no, p.type, p.date, p.amount_sen, p.method,
              p.reference, c.name AS contact_name
       FROM "${tenantSchema}".payments p
       JOIN "${tenantSchema}".contacts c ON c.id = p.contact_id
       WHERE p.deleted_at IS NULL
         AND p.id NOT IN (
           SELECT matched_payment_id
           FROM "${tenantSchema}".bank_transactions
           WHERE matched_payment_id IS NOT NULL
         )
       ORDER BY p.date DESC`,
    )

    return { unreconciledTransactions, unmatchedPayments }
  }

  async startReconSession(tenantSchema: string, dto: StartReconSessionDto, userId: string) {
    // Verify bank account exists
    const acctRows = await this.prisma.$queryRawUnsafe<{ id: string; current_balance_sen: string }[]>(
      `SELECT id, current_balance_sen::text FROM "${tenantSchema}".bank_accounts
       WHERE id = $1::uuid AND deleted_at IS NULL`,
      dto.bankAccountId,
    )
    if (!acctRows.length) throw new NotFoundException('Bank account not found')

    const systemBalanceSen = Number(acctRows[0].current_balance_sen)
    const differenceSen = dto.statementBalanceSen - systemBalanceSen

    const rows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "${tenantSchema}".recon_sessions
         (bank_account_id, period_start, period_end, statement_balance_sen,
          system_balance_sen, difference_sen, status, created_by)
       VALUES ($1::uuid, $2::date, $3::date, $4, $5, $6, 'IN_PROGRESS', $7::uuid)
       RETURNING id`,
      dto.bankAccountId,
      dto.periodStart,
      dto.periodEnd,
      dto.statementBalanceSen,
      systemBalanceSen,
      differenceSen,
      userId,
    )

    return {
      id: rows[0].id,
      bankAccountId: dto.bankAccountId,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      statementBalanceSen: dto.statementBalanceSen,
      systemBalanceSen,
      differenceSen,
      status: 'IN_PROGRESS',
    }
  }

  async completeReconSession(tenantSchema: string, sessionId: string, userId: string) {
    const sessionRows = await this.prisma.$queryRawUnsafe<{
      id: string
      status: string
      bank_account_id: string
      statement_balance_sen: string
    }[]>(
      `SELECT id, status, bank_account_id, statement_balance_sen::text
       FROM "${tenantSchema}".recon_sessions
       WHERE id = $1::uuid`,
      sessionId,
    )
    if (!sessionRows.length) throw new NotFoundException('Reconciliation session not found')

    const session = sessionRows[0]
    if (session.status === 'COMPLETED') {
      throw new BadRequestException('Reconciliation session is already completed')
    }

    // Recalculate the current system balance and difference at completion time
    const acctRows = await this.prisma.$queryRawUnsafe<{ current_balance_sen: string }[]>(
      `SELECT current_balance_sen::text FROM "${tenantSchema}".bank_accounts
       WHERE id = $1::uuid AND deleted_at IS NULL`,
      session.bank_account_id,
    )
    const systemBalanceSen = acctRows.length ? Number(acctRows[0].current_balance_sen) : 0
    const statementBalanceSen = Number(session.statement_balance_sen)
    const differenceSen = statementBalanceSen - systemBalanceSen

    await this.prisma.$queryRawUnsafe(
      `UPDATE "${tenantSchema}".recon_sessions
       SET status = 'COMPLETED', completed_at = NOW(), completed_by = $1::uuid,
           system_balance_sen = $2, difference_sen = $3
       WHERE id = $4::uuid`,
      userId,
      systemBalanceSen,
      differenceSen,
      sessionId,
    )

    return {
      id: sessionId,
      status: 'COMPLETED',
      systemBalanceSen,
      statementBalanceSen,
      differenceSen,
    }
  }
}
