import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface CreateProductDto {
  sku?: string
  barcode?: string
  name: string
  description?: string
  type?: 'PRODUCT' | 'SERVICE' | 'BUNDLE'
  categoryId?: string
  unitOfMeasure?: string
  costPriceSen?: number
  sellingPriceSen?: number
  sstType?: 'SERVICE' | 'SALES' | 'EXEMPT'
  sstRate?: number
  trackInventory?: boolean
  reorderPoint?: number
  reorderQuantity?: number
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantSchema: string, search?: string, page = 1, limit = 25) {
    limit = Math.min(Math.max(limit, 1), 500)
    const params: any[] = []
    const conditions = ['p.deleted_at IS NULL']
    let paramIdx = 0

    if (search) {
      paramIdx++
      conditions.push(`(p.name ILIKE $${paramIdx} OR p.sku ILIKE $${paramIdx} OR p.barcode ILIKE $${paramIdx})`)
      params.push(`%${search}%`)
    }

    const where = conditions.join(' AND ')
    const offset = (page - 1) * limit

    const countRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*) as cnt FROM "${tenantSchema}".products p WHERE ${where}`,
      ...params,
    )
    const total = Number(countRows[0]?.cnt ?? 0)

    paramIdx++
    const limitParam = paramIdx
    paramIdx++
    const offsetParam = paramIdx

    const data = await this.prisma.$queryRawUnsafe(
      `SELECT p.id, p.sku, p.barcode, p.name, p.type, p.unit_of_measure,
              p.cost_price_sen, p.selling_price_sen, p.sst_rate, p.track_inventory,
              p.is_active, p.reorder_point,
              c.name as category_name,
              COALESCE(SUM(sl.quantity), 0) as total_stock
       FROM "${tenantSchema}".products p
       LEFT JOIN "${tenantSchema}".product_categories c ON c.id = p.category_id
       LEFT JOIN "${tenantSchema}".stock_levels sl ON sl.product_id = p.id
       WHERE ${where}
       GROUP BY p.id, c.name
       ORDER BY p.name
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      ...params, limit, offset,
    )

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async findOne(tenantSchema: string, id: string) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT p.*, c.name as category_name
       FROM "${tenantSchema}".products p
       LEFT JOIN "${tenantSchema}".product_categories c ON c.id = p.category_id
       WHERE p.id = $1::uuid AND p.deleted_at IS NULL`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Product not found')
    return rows[0]
  }

  async create(tenantSchema: string, dto: CreateProductDto, userId: string) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "${tenantSchema}".products
         (sku, barcode, name, description, type, category_id, unit_of_measure,
          cost_price_sen, selling_price_sen, sst_type, sst_rate,
          track_inventory, reorder_point, reorder_quantity, created_by)
       VALUES ($1,$2,$3,$4,$5,$6::uuid,$7,$8,$9,$10,$11,$12,$13,$14,$15::uuid)
       RETURNING id`,
      dto.sku || null, dto.barcode || null, dto.name,
      dto.description ?? null, dto.type ?? 'PRODUCT',
      dto.categoryId ?? null, dto.unitOfMeasure ?? 'unit',
      dto.costPriceSen ?? 0, dto.sellingPriceSen ?? 0,
      dto.sstType ?? null, dto.sstRate ?? 0,
      dto.trackInventory ?? true, dto.reorderPoint ?? 0,
      dto.reorderQuantity ?? 0, userId,
    )
    return rows[0]
  }

  async update(tenantSchema: string, id: string, dto: Partial<CreateProductDto>, userId: string) {
    await this.findOne(tenantSchema, id) // ensures exists
    await this.prisma.$queryRawUnsafe(
      `UPDATE "${tenantSchema}".products
       SET name = COALESCE($1, name),
           selling_price_sen = COALESCE($2, selling_price_sen),
           cost_price_sen = COALESCE($3, cost_price_sen),
           is_active = COALESCE($4, is_active),
           updated_at = NOW(),
           updated_by = $5::uuid
       WHERE id = $6::uuid`,
      dto.name ?? null, dto.sellingPriceSen ?? null,
      dto.costPriceSen ?? null, null, userId, id,
    )
    return this.findOne(tenantSchema, id)
  }
}
