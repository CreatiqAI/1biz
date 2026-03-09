import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantSchema: string) {
    return this.prisma.$queryRawUnsafe(
      `SELECT * FROM "${tenantSchema}".warehouses WHERE deleted_at IS NULL ORDER BY name`,
    )
  }

  async create(tenantSchema: string, data: { name: string; code?: string; addressLine1?: string; city?: string; state?: string; isDefault?: boolean }) {
    if (data.isDefault) {
      // Unset current default
      await this.prisma.$queryRawUnsafe(
        `UPDATE "${tenantSchema}".warehouses SET is_default = FALSE`,
      )
    }
    const rows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "${tenantSchema}".warehouses (name, code, address_line1, city, state, is_default)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id`,
      data.name, data.code ?? null, data.addressLine1 ?? null,
      data.city ?? null, data.state ?? null, data.isDefault ?? false,
    )
    return rows[0]
  }
}
