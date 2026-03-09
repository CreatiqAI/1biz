import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import { computeStatutory } from './malaysia-payroll.helper'

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Payroll Runs ─────────────────────────────────────────────────────────────

  async findAllRuns(tenantSchema: string) {
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "${tenantSchema}".payroll_runs ORDER BY period_year DESC, period_month DESC`,
    )
  }

  async findOneRun(tenantSchema: string, id: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "${tenantSchema}".payroll_runs WHERE id = $1::uuid`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Payroll run not found')
    return rows[0]
  }

  async createRun(tenantSchema: string, month: number, year: number, userId: string, notes?: string) {
    const existing = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "${tenantSchema}".payroll_runs WHERE period_month = $1 AND period_year = $2`,
      month,
      year,
    )
    if (existing.length) throw new ConflictException(`A payroll run for ${year}-${String(month).padStart(2, '0')} already exists`)

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "${tenantSchema}".payroll_runs (period_month, period_year, notes, created_by)
       VALUES ($1, $2, $3, $4::uuid) RETURNING *`,
      month,
      year,
      notes ?? null,
      userId,
    )
    return rows[0]
  }

  // ─── Payroll Items ────────────────────────────────────────────────────────────

  async getRunItems(tenantSchema: string, runId: string) {
    await this.findOneRun(tenantSchema, runId)
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT pi.*, e.full_name, e.employee_no, e.bank_name, e.bank_account_number,
              d.name AS department_name
       FROM "${tenantSchema}".payroll_items pi
       JOIN "${tenantSchema}".employees e ON e.id = pi.employee_id
       LEFT JOIN "${tenantSchema}".departments d ON d.id = e.department_id
       WHERE pi.payroll_run_id = $1::uuid
       ORDER BY e.full_name`,
      runId,
    )
  }

  /**
   * Generate payroll items for all active employees in the run.
   * Calculates EPF, SOCSO, EIS, and PCB automatically.
   */
  async generateItems(tenantSchema: string, runId: string) {
    const run = await this.findOneRun(tenantSchema, runId)
    if (run.status !== 'DRAFT') throw new BadRequestException('Can only generate items for a DRAFT payroll run')

    const employees = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id, full_name, date_of_birth, basic_salary_sen,
              epf_opted_out, socso_opted_out, eis_opted_out
       FROM "${tenantSchema}".employees
       WHERE status IN ('ACTIVE', 'PROBATION') AND deleted_at IS NULL`,
    )

    if (!employees.length) throw new BadRequestException('No active employees found to generate payroll for')

    // Clear any existing items for this run first
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM "${tenantSchema}".payroll_items WHERE payroll_run_id = $1::uuid`,
      runId,
    )

    let totals = {
      grossSen: 0,
      netSen: 0,
      epfEmployee: 0,
      epfEmployer: 0,
      socsoEmployee: 0,
      socsoEmployer: 0,
      eisEmployee: 0,
      eisEmployer: 0,
      pcb: 0,
    }

    const daysInMonth = new Date(run.period_year, run.period_month, 0).getDate()

    for (const emp of employees) {
      const grossSen = Number(emp.basic_salary_sen)
      const dob = emp.date_of_birth ? new Date(emp.date_of_birth) : null

      const statutory = computeStatutory(
        grossSen,
        dob,
        Boolean(emp.epf_opted_out),
        Boolean(emp.socso_opted_out),
        Boolean(emp.eis_opted_out),
      )

      const totalDeductions =
        statutory.epfEmployee +
        statutory.socsoEmployee +
        statutory.eisEmployee +
        statutory.pcb

      const netSen = grossSen - totalDeductions

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "${tenantSchema}".payroll_items (
          payroll_run_id, employee_id,
          working_days, days_worked,
          basic_salary_sen, gross_salary_sen,
          epf_employee_sen, epf_employer_sen,
          socso_employee_sen, socso_employer_sen,
          eis_employee_sen, eis_employer_sen,
          pcb_sen, net_salary_sen
        ) VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (payroll_run_id, employee_id) DO UPDATE SET
          basic_salary_sen    = EXCLUDED.basic_salary_sen,
          gross_salary_sen    = EXCLUDED.gross_salary_sen,
          epf_employee_sen    = EXCLUDED.epf_employee_sen,
          epf_employer_sen    = EXCLUDED.epf_employer_sen,
          socso_employee_sen  = EXCLUDED.socso_employee_sen,
          socso_employer_sen  = EXCLUDED.socso_employer_sen,
          eis_employee_sen    = EXCLUDED.eis_employee_sen,
          eis_employer_sen    = EXCLUDED.eis_employer_sen,
          pcb_sen             = EXCLUDED.pcb_sen,
          net_salary_sen      = EXCLUDED.net_salary_sen`,
        runId,
        emp.id,
        daysInMonth,
        daysInMonth, // assume full month worked
        grossSen,
        grossSen,
        statutory.epfEmployee,
        statutory.epfEmployer,
        statutory.socsoEmployee,
        statutory.socsoEmployer,
        statutory.eisEmployee,
        statutory.eisEmployer,
        statutory.pcb,
        netSen,
      )

      totals.grossSen += grossSen
      totals.netSen += netSen
      totals.epfEmployee += statutory.epfEmployee
      totals.epfEmployer += statutory.epfEmployer
      totals.socsoEmployee += statutory.socsoEmployee
      totals.socsoEmployer += statutory.socsoEmployer
      totals.eisEmployee += statutory.eisEmployee
      totals.eisEmployer += statutory.eisEmployer
      totals.pcb += statutory.pcb
    }

    // Update run totals
    await this.prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".payroll_runs SET
        status                  = 'PROCESSING',
        employee_count          = $1,
        total_gross_sen         = $2,
        total_net_sen           = $3,
        total_epf_employee_sen  = $4,
        total_epf_employer_sen  = $5,
        total_socso_employee_sen = $6,
        total_socso_employer_sen = $7,
        total_eis_employee_sen  = $8,
        total_eis_employer_sen  = $9,
        total_pcb_sen           = $10,
        updated_at              = NOW()
      WHERE id = $11::uuid`,
      employees.length,
      totals.grossSen,
      totals.netSen,
      totals.epfEmployee,
      totals.epfEmployer,
      totals.socsoEmployee,
      totals.socsoEmployer,
      totals.eisEmployee,
      totals.eisEmployer,
      totals.pcb,
      runId,
    )

    return { generated: employees.length, runId }
  }

  async approveRun(tenantSchema: string, runId: string, approverId: string) {
    const run = await this.findOneRun(tenantSchema, runId)
    if (run.status !== 'PROCESSING') throw new BadRequestException('Only PROCESSING payroll runs can be approved')

    await this.prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".payroll_runs
       SET status = 'APPROVED', approved_by = $1::uuid, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2::uuid`,
      approverId,
      runId,
    )
    return this.findOneRun(tenantSchema, runId)
  }

  async markPaid(tenantSchema: string, runId: string) {
    const run = await this.findOneRun(tenantSchema, runId)
    if (run.status !== 'APPROVED') throw new BadRequestException('Only APPROVED payroll runs can be marked as paid')

    await this.prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".payroll_runs
       SET status = 'PAID', paid_at = NOW(), updated_at = NOW()
       WHERE id = $1::uuid`,
      runId,
    )
    return this.findOneRun(tenantSchema, runId)
  }

  async updateItem(
    tenantSchema: string,
    itemId: string,
    data: { allowancesSen?: number; overtimeSen?: number; bonusSen?: number; otherDeductionsSen?: number; notes?: string },
  ) {
    // Recalculate gross and net with new values
    const itemRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT pi.*, e.date_of_birth, e.epf_opted_out, e.socso_opted_out, e.eis_opted_out
       FROM "${tenantSchema}".payroll_items pi
       JOIN "${tenantSchema}".employees e ON e.id = pi.employee_id
       WHERE pi.id = $1::uuid`,
      itemId,
    )
    if (!itemRows.length) throw new NotFoundException('Payroll item not found')

    const item = itemRows[0]
    const allowances = data.allowancesSen ?? Number(item.allowances_sen)
    const overtime = data.overtimeSen ?? Number(item.overtime_sen)
    const bonus = data.bonusSen ?? Number(item.bonus_sen)
    const otherDeductions = data.otherDeductionsSen ?? Number(item.other_deductions_sen)
    const gross = Number(item.basic_salary_sen) + allowances + overtime + bonus

    const dob = item.date_of_birth ? new Date(item.date_of_birth) : null
    const statutory = computeStatutory(gross, dob, Boolean(item.epf_opted_out), Boolean(item.socso_opted_out), Boolean(item.eis_opted_out))

    const net = gross - statutory.epfEmployee - statutory.socsoEmployee - statutory.eisEmployee - statutory.pcb - otherDeductions

    await this.prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".payroll_items SET
        allowances_sen      = $1,
        overtime_sen        = $2,
        bonus_sen           = $3,
        gross_salary_sen    = $4,
        epf_employee_sen    = $5,
        epf_employer_sen    = $6,
        socso_employee_sen  = $7,
        socso_employer_sen  = $8,
        eis_employee_sen    = $9,
        eis_employer_sen    = $10,
        pcb_sen             = $11,
        other_deductions_sen = $12,
        net_salary_sen      = $13,
        notes               = $14
      WHERE id = $15::uuid`,
      allowances,
      overtime,
      bonus,
      gross,
      statutory.epfEmployee,
      statutory.epfEmployer,
      statutory.socsoEmployee,
      statutory.socsoEmployer,
      statutory.eisEmployee,
      statutory.eisEmployer,
      statutory.pcb,
      otherDeductions,
      net,
      data.notes ?? item.notes,
      itemId,
    )

    return { updated: true }
  }
}
