import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface CreateLeadDto {
  name: string
  company?: string
  email?: string
  phone?: string
  source?: string
  expectedValueSen?: number
  notes?: string
}

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantSchema: string, status?: string, search?: string, page = 1, limit = 25) {
    limit = Math.min(Math.max(limit, 1), 500)
    const params: any[] = []
    const conditions = ['deleted_at IS NULL']
    let paramIdx = 0

    if (status) {
      paramIdx++
      conditions.push(`status = $${paramIdx}`)
      params.push(status)
    }
    if (search) {
      paramIdx++
      conditions.push(`(name ILIKE $${paramIdx} OR email ILIKE $${paramIdx} OR company ILIKE $${paramIdx})`)
      params.push(`%${search}%`)
    }

    const where = conditions.join(' AND ')
    const offset = (page - 1) * limit

    const countRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*) as cnt FROM "${tenantSchema}".leads WHERE ${where}`,
      ...params,
    )
    const total = Number(countRows[0]?.cnt ?? 0)

    paramIdx++
    const limitParam = paramIdx
    paramIdx++
    const offsetParam = paramIdx

    const data = await this.prisma.$queryRawUnsafe(
      `SELECT * FROM "${tenantSchema}".leads
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      ...params, limit, offset,
    )

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async create(tenantSchema: string, dto: CreateLeadDto, userId: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "${tenantSchema}".leads
         (name, company, email, phone, source, expected_value_sen, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::uuid)
       RETURNING *`,
      dto.name, dto.company ?? null, dto.email ?? null, dto.phone ?? null,
      dto.source ?? null, dto.expectedValueSen ?? 0, dto.notes ?? null, userId,
    )
    return rows[0]
  }

  async update(tenantSchema: string, id: string, dto: Partial<CreateLeadDto> & { status?: string }) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `UPDATE "${tenantSchema}".leads SET
         name = COALESCE($1, name),
         company = COALESCE($2, company),
         email = COALESCE($3, email),
         phone = COALESCE($4, phone),
         source = COALESCE($5, source),
         status = COALESCE($6, status),
         expected_value_sen = COALESCE($7, expected_value_sen),
         notes = COALESCE($8, notes),
         updated_at = NOW()
       WHERE id = $9::uuid AND deleted_at IS NULL
       RETURNING *`,
      dto.name ?? null, dto.company ?? null, dto.email ?? null, dto.phone ?? null,
      dto.source ?? null, dto.status ?? null, dto.expectedValueSen ?? null,
      dto.notes ?? null, id,
    )
    if (!rows.length) throw new NotFoundException('Lead not found')
    return rows[0]
  }

  async remove(tenantSchema: string, id: string) {
    await this.prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".leads SET deleted_at = NOW() WHERE id = $1::uuid`,
      id,
    )
    return { deleted: true }
  }
}
