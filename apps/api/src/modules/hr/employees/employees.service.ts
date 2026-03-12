import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import { getTerminationNoticeWeeks, calculateTerminationBenefits } from '../payroll/malaysia-payroll.helper'

export interface CreateEmployeeDto {
  fullName: string
  icNumber?: string
  passportNumber?: string
  dateOfBirth?: string // ISO date string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  nationality?: string
  email?: string
  phone?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postcode?: string
  departmentId?: string
  positionId?: string
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN'
  hireDate: string // ISO date string — required
  probationEndDate?: string
  basicSalarySen?: number
  bankName?: string
  bankAccountNumber?: string
  epfNumber?: string
  socsoNumber?: string
  incomeTaxNumber?: string
  epfOptedOut?: boolean
  socsoOptedOut?: boolean
  eisOptedOut?: boolean
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED'
  spouseWorking?: boolean
  childrenCount?: number
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelation?: string
  notes?: string
}

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantSchema: string, status?: string) {
    const statusFilter = status ? `AND e.status = '${status}'` : ''
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT e.id, e.employee_no, e.full_name, e.email, e.phone,
              e.status, e.employment_type, e.hire_date, e.basic_salary_sen,
              e.gender, e.date_of_birth,
              d.name AS department_name,
              p.name AS position_name
       FROM "${tenantSchema}".employees e
       LEFT JOIN "${tenantSchema}".departments d ON d.id = e.department_id
       LEFT JOIN "${tenantSchema}".positions p ON p.id = e.position_id
       WHERE e.deleted_at IS NULL ${statusFilter}
       ORDER BY e.full_name`,
    )
  }

  async findOne(tenantSchema: string, id: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT e.*,
              d.name AS department_name,
              p.name AS position_name
       FROM "${tenantSchema}".employees e
       LEFT JOIN "${tenantSchema}".departments d ON d.id = e.department_id
       LEFT JOIN "${tenantSchema}".positions p ON p.id = e.position_id
       WHERE e.id = $1::uuid AND e.deleted_at IS NULL`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Employee not found')
    return rows[0]
  }

  async create(tenantSchema: string, data: CreateEmployeeDto, userId: string) {
    if (data.icNumber) {
      const existing = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT id FROM "${tenantSchema}".employees WHERE ic_number = $1 AND deleted_at IS NULL`,
        data.icNumber,
      )
      if (existing.length) throw new ConflictException('An employee with this IC number already exists')
    }

    // Auto-generate employee number: EMP-0001, EMP-0002, ...
    // Query MAX across ALL employees (including soft-deleted) to avoid unique constraint violations
    const maxRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(employee_no FROM 5) AS INTEGER)), 0) + 1 AS next_no
       FROM "${tenantSchema}".employees`,
    )
    const nextNo = Number(maxRows[0]?.next_no ?? 1)
    const employeeNo = `EMP-${String(nextNo).padStart(4, '0')}`

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "${tenantSchema}".employees (
        employee_no, full_name, ic_number, passport_number, date_of_birth, gender,
        nationality, email, phone,
        address_line1, address_line2, city, state, postcode,
        department_id, position_id, employment_type, hire_date, probation_end_date,
        basic_salary_sen, bank_name, bank_account_number,
        epf_number, socso_number, income_tax_number,
        epf_opted_out, socso_opted_out, eis_opted_out,
        marital_status, spouse_working, children_count,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
        notes, status, created_by
      ) VALUES (
        $1,$2,$3,$4,$5::date,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::uuid,$16::uuid,$17,$18::date,$19::date,
        $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37::uuid
      ) RETURNING id, employee_no, full_name, status`,
      employeeNo,
      data.fullName,
      data.icNumber || null,
      data.passportNumber || null,
      data.dateOfBirth || null,
      data.gender || null,
      data.nationality || 'Malaysian',
      data.email || null,
      data.phone || null,
      data.addressLine1 || null,
      data.addressLine2 || null,
      data.city || null,
      data.state || null,
      data.postcode || null,
      data.departmentId || null,
      data.positionId || null,
      data.employmentType || 'FULL_TIME',
      data.hireDate,
      data.probationEndDate || null,
      data.basicSalarySen ?? 0,
      data.bankName || null,
      data.bankAccountNumber || null,
      data.epfNumber || null,
      data.socsoNumber || null,
      data.incomeTaxNumber || null,
      data.epfOptedOut ?? false,
      data.socsoOptedOut ?? false,
      data.eisOptedOut ?? false,
      data.maritalStatus || 'SINGLE',
      data.spouseWorking ?? true,
      data.childrenCount ?? 0,
      data.emergencyContactName || null,
      data.emergencyContactPhone || null,
      data.emergencyContactRelation || null,
      data.notes || null,
      'ACTIVE',
      userId,
    )
    return rows[0]
  }

  async update(tenantSchema: string, id: string, data: Partial<CreateEmployeeDto>) {
    await this.findOne(tenantSchema, id)
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `UPDATE "${tenantSchema}".employees SET
        full_name               = COALESCE($1, full_name),
        ic_number               = COALESCE($2, ic_number),
        date_of_birth           = COALESCE($3::date, date_of_birth),
        gender                  = COALESCE($4, gender),
        email                   = COALESCE($5, email),
        phone                   = COALESCE($6, phone),
        department_id           = COALESCE($7::uuid, department_id),
        position_id             = COALESCE($8::uuid, position_id),
        employment_type         = COALESCE($9, employment_type),
        basic_salary_sen        = COALESCE($10, basic_salary_sen),
        bank_name               = COALESCE($11, bank_name),
        bank_account_number     = COALESCE($12, bank_account_number),
        epf_number              = COALESCE($13, epf_number),
        socso_number            = COALESCE($14, socso_number),
        income_tax_number       = COALESCE($15, income_tax_number),
        marital_status          = COALESCE($16, marital_status),
        spouse_working          = COALESCE($17, spouse_working),
        children_count          = COALESCE($18, children_count),
        notes                   = COALESCE($19, notes),
        updated_at              = NOW()
      WHERE id = $20::uuid
      RETURNING id, employee_no, full_name, status`,
      data.fullName || null,
      data.icNumber || null,
      data.dateOfBirth || null,
      data.gender || null,
      data.email || null,
      data.phone || null,
      data.departmentId || null,
      data.positionId || null,
      data.employmentType || null,
      data.basicSalarySen ?? null,
      data.bankName || null,
      data.bankAccountNumber || null,
      data.epfNumber || null,
      data.socsoNumber || null,
      data.incomeTaxNumber || null,
      data.maritalStatus || null,
      data.spouseWorking ?? null,
      data.childrenCount ?? null,
      data.notes || null,
      id,
    )
    return rows[0]
  }

  async updateStatus(tenantSchema: string, id: string, status: string, date?: string) {
    await this.findOne(tenantSchema, id)
    const dateField =
      status === 'RESIGNED' ? 'resignation_date' :
      status === 'TERMINATED' ? 'termination_date' : null

    if (dateField && date) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "${tenantSchema}".employees SET status = $1, ${dateField} = $2::date, updated_at = NOW() WHERE id = $3::uuid`,
        status,
        date,
        id,
      )
    } else {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "${tenantSchema}".employees SET status = $1, updated_at = NOW() WHERE id = $2::uuid`,
        status,
        id,
      )
    }
    return this.findOne(tenantSchema, id)
  }

  async remove(tenantSchema: string, id: string) {
    await this.findOne(tenantSchema, id)
    await this.prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".employees SET deleted_at = NOW() WHERE id = $1::uuid`,
      id,
    )
    return { deleted: true }
  }

  // ─── Employment History ─────────────────────────────────────────────────────

  async getHistory(tenantSchema: string, employeeId: string) {
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT eh.*,
              d.name AS department_name,
              p.name AS position_name,
              pd.name AS previous_department_name,
              pp.name AS previous_position_name
       FROM "${tenantSchema}".employment_history eh
       LEFT JOIN "${tenantSchema}".departments d ON d.id = eh.department_id
       LEFT JOIN "${tenantSchema}".positions p ON p.id = eh.position_id
       LEFT JOIN "${tenantSchema}".departments pd ON pd.id = eh.previous_department_id
       LEFT JOIN "${tenantSchema}".positions pp ON pp.id = eh.previous_position_id
       WHERE eh.employee_id = $1::uuid
       ORDER BY eh.effective_date DESC, eh.created_at DESC`,
      employeeId,
    )
  }

  /**
   * Record a job change (transfer, promotion, salary revision) with effective date.
   * Also updates the employee record with new values.
   */
  async recordJobChange(
    tenantSchema: string,
    employeeId: string,
    data: {
      changeType: 'TRANSFER' | 'PROMOTION' | 'SALARY_CHANGE' | 'DEMOTION'
      effectiveDate: string
      departmentId?: string
      positionId?: string
      employmentType?: string
      basicSalarySen?: number
      reason?: string
    },
    userId: string,
  ) {
    const emp = await this.findOne(tenantSchema, employeeId)

    // Record history (append-only)
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "${tenantSchema}".employment_history (
        employee_id, change_type, effective_date,
        department_id, position_id, employment_type, basic_salary_sen,
        previous_department_id, previous_position_id, previous_salary_sen,
        reason, created_by
      ) VALUES ($1::uuid,$2,$3::date,$4::uuid,$5::uuid,$6,$7,$8::uuid,$9::uuid,$10,$11,$12::uuid)`,
      employeeId,
      data.changeType,
      data.effectiveDate,
      data.departmentId ?? emp.department_id,
      data.positionId ?? emp.position_id,
      data.employmentType ?? emp.employment_type,
      data.basicSalarySen ?? Number(emp.basic_salary_sen),
      emp.department_id,
      emp.position_id,
      Number(emp.basic_salary_sen),
      data.reason ?? null,
      userId,
    )

    // Update employee record with new values
    const updates: string[] = []
    const params: any[] = []
    let idx = 1

    if (data.departmentId) {
      updates.push(`department_id = $${idx++}::uuid`)
      params.push(data.departmentId)
    }
    if (data.positionId) {
      updates.push(`position_id = $${idx++}::uuid`)
      params.push(data.positionId)
    }
    if (data.employmentType) {
      updates.push(`employment_type = $${idx++}`)
      params.push(data.employmentType)
    }
    if (data.basicSalarySen !== undefined) {
      updates.push(`basic_salary_sen = $${idx++}`)
      params.push(data.basicSalarySen)
    }

    if (updates.length) {
      updates.push('updated_at = NOW()')
      params.push(employeeId)
      await this.prisma.$executeRawUnsafe(
        `UPDATE "${tenantSchema}".employees SET ${updates.join(', ')} WHERE id = $${idx}::uuid`,
        ...params,
      )
    }

    return this.findOne(tenantSchema, employeeId)
  }

  /**
   * Calculate termination details per Employment Act 1955.
   * Returns notice period, termination benefits, and final pay summary.
   */
  async calculateTermination(tenantSchema: string, employeeId: string, terminationDate: string) {
    const emp = await this.findOne(tenantSchema, employeeId)
    const hireDate = new Date(emp.hire_date)
    const termDate = new Date(terminationDate)
    const yearsOfService = (termDate.getTime() - hireDate.getTime()) / (365.25 * 24 * 3600 * 1000)

    if (yearsOfService < 0) throw new BadRequestException('Termination date cannot be before hire date')

    const basicSalarySen = Number(emp.basic_salary_sen)
    const noticeWeeks = getTerminationNoticeWeeks(yearsOfService)
    const benefitsSen = calculateTerminationBenefits(basicSalarySen, yearsOfService)

    // Notice period pay (weekly = monthly / 4.33)
    const weeklyPaySen = Math.round(basicSalarySen / 4.33)
    const noticePaySen = weeklyPaySen * noticeWeeks

    return {
      employeeId,
      employeeName: emp.full_name,
      hireDate: emp.hire_date,
      terminationDate,
      yearsOfService: Math.round(yearsOfService * 10) / 10,
      basicSalarySen,
      noticeWeeks,
      noticePaySen,
      terminationBenefitsSen: benefitsSen,
      totalSen: noticePaySen + benefitsSen,
    }
  }

  /**
   * Process termination: update status, record history, return final pay summary.
   */
  async processTermination(
    tenantSchema: string,
    employeeId: string,
    data: { terminationDate: string; reason?: string },
    userId: string,
  ) {
    const emp = await this.findOne(tenantSchema, employeeId)
    if (emp.status === 'TERMINATED' || emp.status === 'RESIGNED') {
      throw new BadRequestException('Employee is already terminated or resigned')
    }

    // Record termination in history
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "${tenantSchema}".employment_history (
        employee_id, change_type, effective_date,
        department_id, position_id, employment_type, basic_salary_sen,
        previous_department_id, previous_position_id, previous_salary_sen,
        reason, created_by
      ) VALUES ($1::uuid,'TERMINATION',$2::date,$3::uuid,$4::uuid,$5,$6,$3::uuid,$4::uuid,$6,$7,$8::uuid)`,
      employeeId,
      data.terminationDate,
      emp.department_id,
      emp.position_id,
      emp.employment_type,
      Number(emp.basic_salary_sen),
      data.reason ?? null,
      userId,
    )

    // Update employee status
    await this.prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".employees SET status = 'TERMINATED', termination_date = $1::date, updated_at = NOW() WHERE id = $2::uuid`,
      data.terminationDate,
      employeeId,
    )

    // Return termination calculation
    return this.calculateTermination(tenantSchema, employeeId, data.terminationDate)
  }
}
