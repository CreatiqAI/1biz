import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'

@Injectable()
export class ClaimsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Claim Types ─────────────────────────────────────────────────────────────

  async getClaimTypes(tenantSchema: string) {
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "${tenantSchema}".claim_types WHERE is_active = TRUE ORDER BY name`,
    )
  }

  async createClaimType(
    tenantSchema: string,
    data: { name: string; code: string; description?: string; requiresReceipt?: boolean; isTaxable?: boolean; monthlyLimitSen?: number },
  ) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "${tenantSchema}".claim_types (name, code, description, requires_receipt, is_taxable, monthly_limit_sen)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      data.name,
      data.code.toUpperCase(),
      data.description ?? null,
      data.requiresReceipt ?? true,
      data.isTaxable ?? false,
      data.monthlyLimitSen ?? 0,
    )
    return rows[0]
  }

  // ─── Claims ─────────────────────────────────────────────────────────────────

  async findAll(tenantSchema: string, employeeId?: string, status?: string) {
    const filters: string[] = []
    const params: any[] = []
    let idx = 1

    if (employeeId) {
      filters.push(`c.employee_id = $${idx++}::uuid`)
      params.push(employeeId)
    }
    if (status) {
      filters.push(`c.status = $${idx++}`)
      params.push(status)
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT c.*, e.full_name AS employee_name, e.employee_no
       FROM "${tenantSchema}".claims c
       JOIN "${tenantSchema}".employees e ON e.id = c.employee_id
       ${where}
       ORDER BY c.created_at DESC`,
      ...params,
    )
  }

  async findOne(tenantSchema: string, id: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT c.*, e.full_name AS employee_name, e.employee_no
       FROM "${tenantSchema}".claims c
       JOIN "${tenantSchema}".employees e ON e.id = c.employee_id
       WHERE c.id = $1::uuid`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Claim not found')
    return rows[0]
  }

  async findOneWithLines(tenantSchema: string, id: string) {
    const claim = await this.findOne(tenantSchema, id)
    const lines = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT cl.*, ct.name AS claim_type_name, ct.code AS claim_type_code
       FROM "${tenantSchema}".claim_lines cl
       JOIN "${tenantSchema}".claim_types ct ON ct.id = cl.claim_type_id
       WHERE cl.claim_id = $1::uuid
       ORDER BY cl.date`,
      id,
    )
    return { ...claim, lines }
  }

  async create(
    tenantSchema: string,
    data: {
      employeeId: string
      claimDate: string
      notes?: string
      lines: Array<{
        claimTypeId: string
        description: string
        amountSen: number
        receiptUrl?: string
        date: string
      }>
    },
  ) {
    if (!data.lines.length) throw new BadRequestException('At least one claim line is required')

    // Auto-generate claim number
    const maxRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(claim_no FROM 5) AS INTEGER)), 0) + 1 AS next_no
       FROM "${tenantSchema}".claims`,
    )
    const nextNo = Number(maxRows[0]?.next_no ?? 1)
    const claimNo = `CLM-${String(nextNo).padStart(4, '0')}`

    const totalSen = data.lines.reduce((sum, l) => sum + l.amountSen, 0)

    // Check monthly limits
    for (const line of data.lines) {
      const ctRows = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT monthly_limit_sen FROM "${tenantSchema}".claim_types WHERE id = $1::uuid`,
        line.claimTypeId,
      )
      if (ctRows.length && Number(ctRows[0].monthly_limit_sen) > 0) {
        const month = new Date(line.date).getMonth() + 1
        const year = new Date(line.date).getFullYear()
        const existingRows = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT COALESCE(SUM(cl.amount_sen), 0)::bigint AS total
           FROM "${tenantSchema}".claim_lines cl
           JOIN "${tenantSchema}".claims c ON c.id = cl.claim_id
           WHERE c.employee_id = $1::uuid AND cl.claim_type_id = $2::uuid
             AND c.status != 'REJECTED'
             AND EXTRACT(MONTH FROM cl.date) = $3
             AND EXTRACT(YEAR FROM cl.date) = $4`,
          data.employeeId,
          line.claimTypeId,
          month,
          year,
        )
        const existingTotal = Number(existingRows[0]?.total ?? 0)
        const limit = Number(ctRows[0].monthly_limit_sen)
        if (existingTotal + line.amountSen > limit) {
          throw new BadRequestException(
            `Monthly limit exceeded for this claim type. Limit: RM${(limit / 100).toFixed(2)}, Used: RM${(existingTotal / 100).toFixed(2)}, Requesting: RM${(line.amountSen / 100).toFixed(2)}`,
          )
        }
      }
    }

    // Create the claim
    const claimRows = await this.prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "${tenantSchema}".claims (claim_no, employee_id, claim_date, total_amount_sen, notes)
       VALUES ($1, $2::uuid, $3::date, $4, $5) RETURNING *`,
      claimNo,
      data.employeeId,
      data.claimDate,
      totalSen,
      data.notes ?? null,
    )
    const claim = claimRows[0]

    // Insert claim lines
    for (const line of data.lines) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "${tenantSchema}".claim_lines (claim_id, claim_type_id, description, amount_sen, receipt_url, date)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::date)`,
        claim.id,
        line.claimTypeId,
        line.description,
        line.amountSen,
        line.receiptUrl ?? null,
        line.date,
      )
    }

    return this.findOneWithLines(tenantSchema, claim.id)
  }

  async approve(tenantSchema: string, claimId: string, approverId: string) {
    const claim = await this.findOne(tenantSchema, claimId)
    if (claim.status !== 'PENDING') throw new BadRequestException('Only pending claims can be approved')

    await this.prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".claims SET status = 'APPROVED', approved_by = $1::uuid, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2::uuid`,
      approverId,
      claimId,
    )
    return this.findOne(tenantSchema, claimId)
  }

  async reject(tenantSchema: string, claimId: string, approverId: string, reason?: string) {
    const claim = await this.findOne(tenantSchema, claimId)
    if (claim.status !== 'PENDING') throw new BadRequestException('Only pending claims can be rejected')

    await this.prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".claims SET status = 'REJECTED', approved_by = $1::uuid, approved_at = NOW(),
       rejection_reason = $2, updated_at = NOW()
       WHERE id = $3::uuid`,
      approverId,
      reason ?? null,
      claimId,
    )
    return this.findOne(tenantSchema, claimId)
  }

  /**
   * Get total approved but unpaid claims for an employee (for payroll integration).
   */
  async getApprovedUnpaidTotal(tenantSchema: string, employeeId: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COALESCE(SUM(total_amount_sen), 0)::bigint AS total_sen, COUNT(*)::int AS claim_count
       FROM "${tenantSchema}".claims
       WHERE employee_id = $1::uuid AND status = 'APPROVED' AND payroll_run_id IS NULL`,
      employeeId,
    )
    return { totalSen: Number(rows[0]?.total_sen ?? 0), claimCount: rows[0]?.claim_count ?? 0 }
  }

  /**
   * Link approved claims to a payroll run (mark as paid).
   */
  async linkToPayroll(tenantSchema: string, employeeId: string, payrollRunId: string) {
    await this.prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".claims SET status = 'PAID', payroll_run_id = $1::uuid, updated_at = NOW()
       WHERE employee_id = $2::uuid AND status = 'APPROVED' AND payroll_run_id IS NULL`,
      payrollRunId,
      employeeId,
    )
  }
}
