import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'

@Injectable()
export class PositionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantSchema: string) {
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT p.id, p.name, p.department_id, p.is_active, p.created_at,
              d.name AS department_name,
              COUNT(e.id) AS employee_count
       FROM "${tenantSchema}".positions p
       LEFT JOIN "${tenantSchema}".departments d ON d.id = p.department_id
       LEFT JOIN "${tenantSchema}".employees e
         ON e.position_id = p.id AND e.deleted_at IS NULL AND e.status IN ('ACTIVE','PROBATION')
       WHERE p.deleted_at IS NULL
       GROUP BY p.id, d.name
       ORDER BY p.name`,
    )
  }

  async create(
    tenantSchema: string,
    data: { name: string; departmentId?: string },
  ) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "${tenantSchema}".positions (name, department_id)
       VALUES ($1, $2::uuid)
       RETURNING *`,
      data.name,
      data.departmentId ?? null,
    )
    return rows[0]
  }

  async update(tenantSchema: string, id: string, data: { name?: string; departmentId?: string; isActive?: boolean }) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `UPDATE "${tenantSchema}".positions
       SET name          = COALESCE($1, name),
           department_id = COALESCE($2::uuid, department_id),
           is_active     = COALESCE($3, is_active),
           updated_at    = NOW()
       WHERE id = $4::uuid AND deleted_at IS NULL
       RETURNING *`,
      data.name ?? null,
      data.departmentId ?? null,
      data.isActive ?? null,
      id,
    )
    if (!rows.length) throw new NotFoundException('Position not found')
    return rows[0]
  }

  async remove(tenantSchema: string, id: string) {
    const empCheck = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "${tenantSchema}".employees WHERE position_id = $1::uuid AND deleted_at IS NULL LIMIT 1`,
      id,
    )
    if (empCheck.length) throw new ConflictException('Cannot delete position with active employees')
    await this.prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".positions SET deleted_at = NOW() WHERE id = $1::uuid`,
      id,
    )
    return { deleted: true }
  }
}
