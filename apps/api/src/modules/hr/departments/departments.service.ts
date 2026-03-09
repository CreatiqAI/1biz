import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantSchema: string) {
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT d.id, d.name, d.code, d.description, d.parent_id, d.is_active,
              d.created_at,
              COUNT(e.id) AS employee_count
       FROM "${tenantSchema}".departments d
       LEFT JOIN "${tenantSchema}".employees e
         ON e.department_id = d.id AND e.deleted_at IS NULL AND e.status = 'ACTIVE'
       WHERE d.deleted_at IS NULL
       GROUP BY d.id
       ORDER BY d.name`,
    )
  }

  async findOne(tenantSchema: string, id: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "${tenantSchema}".departments WHERE id = $1::uuid AND deleted_at IS NULL`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Department not found')
    return rows[0]
  }

  async create(
    tenantSchema: string,
    data: { name: string; code?: string; description?: string; parentId?: string },
  ) {
    if (data.code) {
      const existing = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT id FROM "${tenantSchema}".departments WHERE code = $1 AND deleted_at IS NULL`,
        data.code,
      )
      if (existing.length) throw new ConflictException('Department code already exists')
    }

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "${tenantSchema}".departments (name, code, description, parent_id)
       VALUES ($1, $2, $3, $4::uuid)
       RETURNING *`,
      data.name,
      data.code ?? null,
      data.description ?? null,
      data.parentId ?? null,
    )
    return rows[0]
  }

  async update(tenantSchema: string, id: string, data: { name?: string; code?: string; description?: string; isActive?: boolean }) {
    await this.findOne(tenantSchema, id)
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `UPDATE "${tenantSchema}".departments
       SET name        = COALESCE($1, name),
           code        = COALESCE($2, code),
           description = COALESCE($3, description),
           is_active   = COALESCE($4, is_active),
           updated_at  = NOW()
       WHERE id = $5::uuid
       RETURNING *`,
      data.name ?? null,
      data.code ?? null,
      data.description ?? null,
      data.isActive ?? null,
      id,
    )
    return rows[0]
  }

  async remove(tenantSchema: string, id: string) {
    await this.findOne(tenantSchema, id)
    const empCheck = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "${tenantSchema}".employees WHERE department_id = $1::uuid AND deleted_at IS NULL LIMIT 1`,
      id,
    )
    if (empCheck.length) throw new ConflictException('Cannot delete department with active employees')
    await this.prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".departments SET deleted_at = NOW() WHERE id = $1::uuid`,
      id,
    )
    return { deleted: true }
  }
}
