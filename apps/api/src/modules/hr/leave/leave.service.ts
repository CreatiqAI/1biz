import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import { getLeaveEntitlement } from '../payroll/malaysia-payroll.helper'

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
    data: { name: string; code: string; daysPerYear?: number; isPaid?: boolean; requiresDocument?: boolean; carryoverDays?: number },
  ) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "${tenantSchema}".leave_types (name, code, days_per_year, is_paid, requires_document, carryover_days)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      data.name,
      data.code.toUpperCase(),
      data.daysPerYear ?? 0,
      data.isPaid ?? true,
      data.requiresDocument ?? false,
      data.carryoverDays ?? 0,
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

  /**
   * Initialise leave balances for an employee for a given year.
   * Uses tenure-based entitlements per Employment Act 1955:
   *   Annual Leave: <2yr = 8d, 2-5yr = 12d, >5yr = 16d
   *   Sick Leave:   <2yr = 14d, 2-5yr = 18d, >5yr = 22d
   *   Hospitalization: 60 days (static)
   *   Maternity: 98 days (requires eligibility check at request time)
   *   Paternity: 7 days (requires eligibility check at request time)
   */
  async initLeaveBalancesForEmployee(tenantSchema: string, employeeId: string, year: number) {
    // Get employee hire date to calculate tenure
    const empRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT hire_date, gender, confinement_count FROM "${tenantSchema}".employees WHERE id = $1::uuid AND deleted_at IS NULL`,
      employeeId,
    )
    if (!empRows.length) throw new NotFoundException('Employee not found')

    const emp = empRows[0]
    const hireDate = new Date(emp.hire_date)
    const yearStart = new Date(year, 0, 1)
    const yearsOfService = Math.max(0, (yearStart.getTime() - hireDate.getTime()) / (365.25 * 24 * 3600 * 1000))

    // Get carryover from previous year
    const prevYear = year - 1
    const prevBalances = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT lb.leave_type_id, lb.entitled_days, lb.taken_days, lb.pending_days,
              lt.code, lt.carryover_days
       FROM "${tenantSchema}".leave_balances lb
       JOIN "${tenantSchema}".leave_types lt ON lt.id = lb.leave_type_id
       WHERE lb.employee_id = $1::uuid AND lb.year = $2`,
      employeeId,
      prevYear,
    )
    const carryoverMap = new Map<string, number>()
    for (const pb of prevBalances) {
      const maxCarryover = Number(pb.carryover_days) || 0
      if (maxCarryover > 0) {
        const remaining = Number(pb.entitled_days) - Number(pb.taken_days) - Number(pb.pending_days)
        carryoverMap.set(pb.leave_type_id, Math.min(Math.max(0, remaining), maxCarryover))
      }
    }

    const types = await this.getLeaveTypes(tenantSchema)
    for (const lt of types) {
      let entitledDays = Number(lt.days_per_year)

      // Auto-calculate tenure-based entitlements for statutory leave types
      if (lt.code === 'AL') {
        entitledDays = getLeaveEntitlement(yearsOfService, 'ANNUAL')
      } else if (lt.code === 'MC') {
        entitledDays = getLeaveEntitlement(yearsOfService, 'SICK')
      }
      // HL, MAT, PAT keep their static days_per_year values

      // Add carryover from previous year
      const carryover = carryoverMap.get(lt.id) ?? 0
      const totalEntitled = entitledDays + carryover

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "${tenantSchema}".leave_balances (employee_id, leave_type_id, year, entitled_days)
         VALUES ($1::uuid, $2::uuid, $3, $4)
         ON CONFLICT (employee_id, leave_type_id, year) DO UPDATE SET entitled_days = $4`,
        employeeId,
        lt.id,
        year,
        totalEntitled,
      )
    }
  }

  /**
   * Bulk initialise leave balances for all active employees for a given year.
   */
  async initAllEmployeeBalances(tenantSchema: string, year: number) {
    const employees = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "${tenantSchema}".employees WHERE status IN ('ACTIVE', 'PROBATION') AND deleted_at IS NULL`,
    )
    for (const emp of employees) {
      await this.initLeaveBalancesForEmployee(tenantSchema, emp.id, year)
    }
    return { initialized: employees.length, year }
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
    const year = new Date(data.startDate).getFullYear()

    // Get leave type info for eligibility checks
    const ltRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "${tenantSchema}".leave_types WHERE id = $1::uuid`,
      data.leaveTypeId,
    )
    if (!ltRows.length) throw new NotFoundException('Leave type not found')
    const leaveType = ltRows[0]

    // Get employee info for maternity/paternity checks
    const empRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT hire_date, gender, confinement_count FROM "${tenantSchema}".employees WHERE id = $1::uuid AND deleted_at IS NULL`,
      data.employeeId,
    )
    if (!empRows.length) throw new NotFoundException('Employee not found')
    const emp = empRows[0]

    // ── Maternity eligibility ──
    if (leaveType.code === 'MAT') {
      if (emp.gender !== 'FEMALE') {
        throw new BadRequestException('Maternity leave is only available for female employees')
      }
      if (data.days < 98) {
        throw new BadRequestException('Maternity leave must be at least 98 consecutive days')
      }
    }

    // ── Paternity eligibility ──
    if (leaveType.code === 'PAT') {
      if (emp.gender !== 'MALE') {
        throw new BadRequestException('Paternity leave is only available for male employees')
      }
      // Must have at least 12 months of service
      const hireDate = new Date(emp.hire_date)
      const requestDate = new Date(data.startDate)
      const monthsOfService = (requestDate.getFullYear() - hireDate.getFullYear()) * 12 + (requestDate.getMonth() - hireDate.getMonth())
      if (monthsOfService < 12) {
        throw new BadRequestException('Paternity leave requires at least 12 months of service')
      }
      // Max 5 confinements
      if ((emp.confinement_count ?? 0) >= 5) {
        throw new BadRequestException('Paternity leave is limited to 5 confinements')
      }
      if (data.days > 7) {
        throw new BadRequestException('Paternity leave is limited to 7 consecutive days')
      }
    }

    // Deduct public holidays that fall within the leave period (don't count them as leave days)
    const phRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int AS ph_count FROM "${tenantSchema}".public_holidays
       WHERE date BETWEEN $1::date AND $2::date AND is_active = TRUE`,
      data.startDate,
      data.endDate,
    )
    const phCount = phRows[0]?.ph_count ?? 0
    const effectiveDays = Math.max(0, data.days - phCount)

    // Check balance
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
      if (remaining < effectiveDays) {
        throw new BadRequestException(
          `Insufficient leave balance. Available: ${remaining.toFixed(1)} days, Requested: ${effectiveDays} days${phCount > 0 ? ` (${phCount} public holiday(s) excluded)` : ''}`,
        )
      }

      // Reserve pending days
      await this.prisma.$executeRawUnsafe(
        `UPDATE "${tenantSchema}".leave_balances
         SET pending_days = pending_days + $1
         WHERE employee_id = $2::uuid AND leave_type_id = $3::uuid AND year = $4`,
        effectiveDays,
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
      effectiveDays,
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

    // If paternity leave approved, increment confinement_count
    const ltRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT code FROM "${tenantSchema}".leave_types WHERE id = $1::uuid`,
      req.leave_type_id,
    )
    if (ltRows.length && ltRows[0].code === 'PAT') {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "${tenantSchema}".employees SET confinement_count = confinement_count + 1 WHERE id = $1::uuid`,
        req.employee_id,
      )
    }

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

  /**
   * Calculate pro-rata leave for termination.
   * Returns unused entitled leave days for the current year up to termination date.
   */
  async calculateProRataLeave(tenantSchema: string, employeeId: string, terminationDate: string) {
    const year = new Date(terminationDate).getFullYear()
    const termDate = new Date(terminationDate)
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31)
    const totalDaysInYear = (yearEnd.getTime() - yearStart.getTime()) / (24 * 3600 * 1000) + 1
    const daysWorked = (termDate.getTime() - yearStart.getTime()) / (24 * 3600 * 1000) + 1
    const proRataFraction = daysWorked / totalDaysInYear

    const balances = await this.getEmployeeBalances(tenantSchema, employeeId, year)
    const results = balances.map((b: any) => {
      const proRataEntitled = Math.round(Number(b.entitled_days) * proRataFraction * 10) / 10
      const taken = Number(b.taken_days) + Number(b.pending_days)
      const unused = Math.max(0, proRataEntitled - taken)
      return {
        leaveType: b.leave_type_name,
        code: b.code,
        fullEntitlement: Number(b.entitled_days),
        proRataEntitled,
        taken,
        unusedDays: unused,
      }
    })

    return results
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
