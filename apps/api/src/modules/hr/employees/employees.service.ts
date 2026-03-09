import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'

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
        emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
        notes, status, created_by
      ) VALUES (
        $1,$2,$3,$4,$5::date,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::uuid,$16::uuid,$17,$18::date,$19::date,
        $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34::uuid
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
        notes                   = COALESCE($16, notes),
        updated_at              = NOW()
      WHERE id = $17::uuid
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
}
