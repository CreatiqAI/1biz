import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'

// Default Malaysian statutory leave types seeded for every new company
export const DEFAULT_LEAVE_TYPES = [
  { name: 'Annual Leave', code: 'AL', daysPerYear: 14, isPaid: true, requiresDocument: false, isSystem: true },
  { name: 'Medical Leave', code: 'MC', daysPerYear: 14, isPaid: true, requiresDocument: true, isSystem: true },
  { name: 'Hospitalisation Leave', code: 'HL', daysPerYear: 60, isPaid: true, requiresDocument: true, isSystem: true },
  { name: 'Maternity Leave', code: 'MAT', daysPerYear: 98, isPaid: true, requiresDocument: true, isSystem: true },
  { name: 'Paternity Leave', code: 'PAT', daysPerYear: 7, isPaid: true, requiresDocument: false, isSystem: true },
  { name: 'Emergency Leave', code: 'EL', daysPerYear: 3, isPaid: true, requiresDocument: false, isSystem: false },
  { name: 'Unpaid Leave', code: 'UL', daysPerYear: 0, isPaid: false, requiresDocument: false, isSystem: false },
]

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Leave Types ─────────────────────────────────────────────────────────────

  async getLeaveTypes(tenantSchema: string) {
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "${tenantSchema}".leave_types WHERE is_active = TRUE ORDER BY name`,
    )
  }

  async createLeaveType(
    tenantSchema: string,
    data: { name: string; code: string; daysPerYear?: number; isPaid?: boolean; requiresDocument?: boolean },
  ) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "${tenantSchema}".leave_types (name, code, days_per_year, is_paid, requires_document)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      data.name,
      data.code.toUpperCase(),
      data.daysPerYear ?? 0,
      data.isPaid ?? true,
      data.requiresDocument ?? false,
    )
    return rows[0]
  }

  // ─── Leave Balances ───────────────────────────────────────────────────────────

  async getEmployeeBalances(tenantSchema: string, employeeId: string, year?: number) {
    const targetYear = year ?? new Date().getFullYear()
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT lb.*, lt.name AS leave_type_name, lt.code, lt.is_paid,
              (lb.entitled_days - lb.taken_days - lb.pending_days) AS remaining_days
       FROM "${tenantSchema}".leave_balances lb
       JOIN "${tenantSchema}".leave_types lt ON lt.id = lb.leave_type_id
       WHERE lb.employee_id = $1::uuid AND lb.year = $2
       ORDER BY lt.name`,
      employeeId,
      targetYear,
    )
  }

  async initLeaveBalancesForEmployee(tenantSchema: string, employeeId: string, year: number) {
    const types = await this.getLeaveTypes(tenantSchema)
    for (const lt of types) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "${tenantSchema}".leave_balances (employee_id, leave_type_id, year, entitled_days)
         VALUES ($1::uuid, $2::uuid, $3, $4)
         ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING`,
        employeeId,
        lt.id,
        year,
        lt.days_per_year,
      )
    }
  }

  // ─── Leave Requests ───────────────────────────────────────────────────────────

  async getRequests(tenantSchema: string, employeeId?: string, status?: string) {
    const filters: string[] = []
    const params: any[] = []
    let paramIdx = 1

    if (employeeId) {
      filters.push(`lr.employee_id = $${paramIdx++}::uuid`)
      params.push(employeeId)
    }
    if (status) {
      filters.push(`lr.status = $${paramIdx++}`)
      params.push(status)
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT lr.*, e.full_name AS employee_name, e.employee_no,
              lt.name AS leave_type_name, lt.code AS leave_type_code
       FROM "${tenantSchema}".leave_requests lr
       JOIN "${tenantSchema}".employees e ON e.id = lr.employee_id
       JOIN "${tenantSchema}".leave_types lt ON lt.id = lr.leave_type_id
       ${where}
       ORDER BY lr.created_at DESC`,
      ...params,
    )
  }

  async createRequest(
    tenantSchema: string,
    data: {
      employeeId: string
      leaveTypeId: string
      startDate: string
      endDate: string
      days: number
      reason?: string
    },
  ) {
    // Check balance
    const year = new Date(data.startDate).getFullYear()
    const balanceRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "${tenantSchema}".leave_balances
       WHERE employee_id = $1::uuid AND leave_type_id = $2::uuid AND year = $3`,
      data.employeeId,
      data.leaveTypeId,
      year,
    )

    if (balanceRows.length) {
      const balance = balanceRows[0]
      const remaining = Number(balance.entitled_days) - Number(balance.taken_days) - Number(balance.pending_days)
      if (remaining < data.days) {
        throw new BadRequestException(
          `Insufficient leave balance. Available: ${remaining.toFixed(1)} days, Requested: ${data.days} days`,
        )
      }

      // Reserve pending days
      await this.prisma.$executeRawUnsafe(
        `UPDATE "${tenantSchema}".leave_balances
         SET pending_days = pending_days + $1
         WHERE employee_id = $2::uuid AND leave_type_id = $3::uuid AND year = $4`,
        data.days,
        data.employeeId,
        data.leaveTypeId,
        year,
      )
    }

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "${tenantSchema}".leave_requests
         (employee_id, leave_type_id, start_date, end_date, days, reason)
       VALUES ($1::uuid,$2::uuid,$3::date,$4::date,$5,$6) RETURNING *`,
      data.employeeId,
      data.leaveTypeId,
      data.startDate,
      data.endDate,
      data.days,
      data.reason ?? null,
    )
    return rows[0]
  }

  async approveRequest(tenantSchema: string, requestId: string, approverId: string) {
    const req = await this._getRequest(tenantSchema, requestId)
    if (req.status !== 'PENDING') throw new BadRequestException('Only pending requests can be approved')

    const year = new Date(req.start_date).getFullYear()

    await this.prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".leave_requests
       SET status = 'APPROVED', approved_by = $1::uuid, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2::uuid`,
      approverId,
      requestId,
    )

    // Move pending → taken
    await this.prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".leave_balances
       SET taken_days   = taken_days + $1,
           pending_days = GREATEST(0, pending_days - $1)
       WHERE employee_id = $2::uuid AND leave_type_id = $3::uuid AND year = $4`,
      req.days,
      req.employee_id,
      req.leave_type_id,
      year,
    )

    return { approved: true }
  }

  async rejectRequest(tenantSchema: string, requestId: string, approverId: string, reason?: string) {
    const req = await this._getRequest(tenantSchema, requestId)
    if (req.status !== 'PENDING') throw new BadRequestException('Only pending requests can be rejected')

    const year = new Date(req.start_date).getFullYear()

    await this.prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".leave_requests
       SET status = 'REJECTED', approved_by = $1::uuid, approved_at = NOW(),
           rejection_reason = $2, updated_at = NOW()
       WHERE id = $3::uuid`,
      approverId,
      reason ?? null,
      requestId,
    )

    // Release pending days
    await this.prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".leave_balances
       SET pending_days = GREATEST(0, pending_days - $1)
       WHERE employee_id = $2::uuid AND leave_type_id = $3::uuid AND year = $4`,
      req.days,
      req.employee_id,
      req.leave_type_id,
      year,
    )

    return { rejected: true }
  }

  private async _getRequest(tenantSchema: string, requestId: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "${tenantSchema}".leave_requests WHERE id = $1::uuid`,
      requestId,
    )
    if (!rows.length) throw new NotFoundException('Leave request not found')
    return rows[0]
  }
}
