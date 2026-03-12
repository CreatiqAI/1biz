import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import { calculateOvertimePay } from '../payroll/malaysia-payroll.helper'

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get work entries for an employee in a date range.
   */
  async getEntries(tenantSchema: string, employeeId: string, startDate: string, endDate: string) {
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT we.*, e.full_name, e.employee_no
       FROM "${tenantSchema}".work_entries we
       JOIN "${tenantSchema}".employees e ON e.id = we.employee_id
       WHERE we.employee_id = $1::uuid AND we.date BETWEEN $2::date AND $3::date
       ORDER BY we.date`,
      employeeId,
      startDate,
      endDate,
    )
  }

  /**
   * Get all work entries for a month (all employees).
   */
  async getMonthlyEntries(tenantSchema: string, year: number, month: number) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT we.*, e.full_name, e.employee_no
       FROM "${tenantSchema}".work_entries we
       JOIN "${tenantSchema}".employees e ON e.id = we.employee_id
       WHERE we.date BETWEEN $1::date AND $2::date
       ORDER BY e.full_name, we.date`,
      startDate,
      endDate,
    )
  }

  /**
   * Create or update a work entry for a specific employee and date (manual entry).
   */
  async upsertEntry(
    tenantSchema: string,
    data: {
      employeeId: string
      date: string
      normalHours?: number
      overtimeHours?: number
      restDayHours?: number
      phHours?: number
      isRestDay?: boolean
      isPublicHoliday?: boolean
      isAbsent?: boolean
      isLate?: boolean
      notes?: string
    },
    userId: string,
  ) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "${tenantSchema}".work_entries (
        employee_id, date, normal_hours, overtime_hours, rest_day_hours, ph_hours,
        is_rest_day, is_public_holiday, is_absent, is_late, notes, created_by
      ) VALUES ($1::uuid,$2::date,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::uuid)
      ON CONFLICT (employee_id, date) DO UPDATE SET
        normal_hours     = EXCLUDED.normal_hours,
        overtime_hours   = EXCLUDED.overtime_hours,
        rest_day_hours   = EXCLUDED.rest_day_hours,
        ph_hours         = EXCLUDED.ph_hours,
        is_rest_day      = EXCLUDED.is_rest_day,
        is_public_holiday= EXCLUDED.is_public_holiday,
        is_absent        = EXCLUDED.is_absent,
        is_late          = EXCLUDED.is_late,
        notes            = EXCLUDED.notes
      RETURNING *`,
      data.employeeId,
      data.date,
      data.normalHours ?? 8,
      data.overtimeHours ?? 0,
      data.restDayHours ?? 0,
      data.phHours ?? 0,
      data.isRestDay ?? false,
      data.isPublicHoliday ?? false,
      data.isAbsent ?? false,
      data.isLate ?? false,
      data.notes ?? null,
      userId,
    )
    return rows[0]
  }

  /**
   * Bulk create/update work entries for multiple employees.
   */
  async bulkUpsert(
    tenantSchema: string,
    entries: Array<{
      employeeId: string
      date: string
      normalHours?: number
      overtimeHours?: number
      restDayHours?: number
      phHours?: number
      isRestDay?: boolean
      isPublicHoliday?: boolean
      isAbsent?: boolean
      isLate?: boolean
      notes?: string
    }>,
    userId: string,
  ) {
    const results = []
    for (const entry of entries) {
      results.push(await this.upsertEntry(tenantSchema, entry, userId))
    }
    return { updated: results.length }
  }

  /**
   * Delete a work entry.
   */
  async deleteEntry(tenantSchema: string, id: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "${tenantSchema}".work_entries WHERE id = $1::uuid`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Work entry not found')

    await this.prisma.$executeRawUnsafe(
      `DELETE FROM "${tenantSchema}".work_entries WHERE id = $1::uuid`,
      id,
    )
    return { deleted: true }
  }

  /**
   * Get monthly attendance summary for an employee.
   * Returns total hours, OT hours, days worked, absences, lates.
   */
  async getMonthlySummary(tenantSchema: string, employeeId: string, year: number, month: number) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT
        COUNT(*)::int AS total_entries,
        SUM(CASE WHEN is_absent = FALSE THEN 1 ELSE 0 END)::int AS days_worked,
        SUM(CASE WHEN is_absent = TRUE THEN 1 ELSE 0 END)::int AS absences,
        SUM(CASE WHEN is_late = TRUE THEN 1 ELSE 0 END)::int AS lates,
        COALESCE(SUM(normal_hours), 0) AS total_normal_hours,
        COALESCE(SUM(overtime_hours), 0) AS total_overtime_hours,
        COALESCE(SUM(rest_day_hours), 0) AS total_rest_day_hours,
        COALESCE(SUM(ph_hours), 0) AS total_ph_hours
       FROM "${tenantSchema}".work_entries
       WHERE employee_id = $1::uuid AND date BETWEEN $2::date AND $3::date`,
      employeeId,
      startDate,
      endDate,
    )

    const summary = rows[0] ?? {}

    // Get employee salary for OT calculation
    const empRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT basic_salary_sen FROM "${tenantSchema}".employees WHERE id = $1::uuid`,
      employeeId,
    )
    const basicSalarySen = empRows.length ? Number(empRows[0].basic_salary_sen) : 0

    const otCalc = calculateOvertimePay(
      basicSalarySen,
      Number(summary.total_overtime_hours) || 0,
      Number(summary.total_rest_day_hours) || 0,
      Number(summary.total_ph_hours) || 0,
    )

    return {
      employeeId,
      year,
      month,
      daysWorked: summary.days_worked ?? 0,
      absences: summary.absences ?? 0,
      lates: summary.lates ?? 0,
      totalNormalHours: Number(summary.total_normal_hours) || 0,
      totalOvertimeHours: Number(summary.total_overtime_hours) || 0,
      totalRestDayHours: Number(summary.total_rest_day_hours) || 0,
      totalPhHours: Number(summary.total_ph_hours) || 0,
      overtimePay: otCalc,
    }
  }

  /**
   * Get monthly summaries for all employees (used by payroll).
   */
  async getAllMonthlySummaries(tenantSchema: string, year: number, month: number) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT
        we.employee_id,
        e.full_name,
        e.employee_no,
        e.basic_salary_sen,
        COUNT(*)::int AS total_entries,
        SUM(CASE WHEN we.is_absent = FALSE THEN 1 ELSE 0 END)::int AS days_worked,
        SUM(CASE WHEN we.is_absent = TRUE THEN 1 ELSE 0 END)::int AS absences,
        SUM(CASE WHEN we.is_late = TRUE THEN 1 ELSE 0 END)::int AS lates,
        COALESCE(SUM(we.normal_hours), 0) AS total_normal_hours,
        COALESCE(SUM(we.overtime_hours), 0) AS total_overtime_hours,
        COALESCE(SUM(we.rest_day_hours), 0) AS total_rest_day_hours,
        COALESCE(SUM(we.ph_hours), 0) AS total_ph_hours
       FROM "${tenantSchema}".work_entries we
       JOIN "${tenantSchema}".employees e ON e.id = we.employee_id
       WHERE we.date BETWEEN $1::date AND $2::date
       GROUP BY we.employee_id, e.full_name, e.employee_no, e.basic_salary_sen
       ORDER BY e.full_name`,
      startDate,
      endDate,
    )

    return rows.map((r) => {
      const otCalc = calculateOvertimePay(
        Number(r.basic_salary_sen) || 0,
        Number(r.total_overtime_hours) || 0,
        Number(r.total_rest_day_hours) || 0,
        Number(r.total_ph_hours) || 0,
      )
      return {
        employeeId: r.employee_id,
        fullName: r.full_name,
        employeeNo: r.employee_no,
        daysWorked: r.days_worked,
        absences: r.absences,
        lates: r.lates,
        totalOvertimeHours: Number(r.total_overtime_hours),
        totalRestDayHours: Number(r.total_rest_day_hours),
        totalPhHours: Number(r.total_ph_hours),
        overtimePay: otCalc,
      }
    })
  }
}
