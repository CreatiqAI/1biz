import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantSchema: string) {
    const rows = await this.prisma.$queryRawUnsafe<{
      id: string
      code: string
      name: string
      type: string
      sub_type: string
      is_active: boolean
      is_system: boolean
    }[]>(
      `SELECT id, code, name, type, sub_type, is_active, is_system
       FROM "${tenantSchema}".accounts
       WHERE deleted_at IS NULL
       ORDER BY code`,
    )
    return rows
  }

  async findOne(tenantSchema: string, id: string) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: string; code: string; name: string }[]>(
      `SELECT * FROM "${tenantSchema}".accounts WHERE id = $1::uuid AND deleted_at IS NULL`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Account not found')
    return rows[0]
  }

  async create(tenantSchema: string, data: { code: string; name: string; type: string; subType?: string }, userId: string) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "${tenantSchema}".accounts (code, name, type, sub_type, created_by)
       VALUES ($1, $2, $3, $4, $5::uuid)
       RETURNING id`,
      data.code,
      data.name,
      data.type,
      data.subType ?? null,
      userId,
    )
    return rows[0]
  }
}
