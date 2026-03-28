import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export type MovementType = 'RECEIVE' | 'ISSUE' | 'ADJUSTMENT' | 'TRANSFER_OUT' | 'TRANSFER_IN'

export interface StockMovementDto {
  type: MovementType
  productId: string
  warehouseId: string
  destWarehouseId?: string
  quantity: number
  unitCostSen?: number
  referenceType?: string
  referenceId?: string
  notes?: string
}

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async getStockLevel(tenantSchema: string, productId: string, warehouseId?: string) {
    if (warehouseId) {
      return this.prisma.$queryRawUnsafe(
        `SELECT sl.product_id, sl.warehouse_id, sl.quantity, sl.reserved_quantity,
                sl.average_cost_sen, w.name as warehouse_name, p.name as product_name
         FROM "${tenantSchema}".stock_levels sl
         JOIN "${tenantSchema}".warehouses w ON w.id = sl.warehouse_id
         JOIN "${tenantSchema}".products p ON p.id = sl.product_id
         WHERE sl.product_id = $1::uuid AND sl.warehouse_id = $2::uuid`,
        productId, warehouseId,
      )
    }
    return this.prisma.$queryRawUnsafe(
      `SELECT sl.product_id, sl.warehouse_id, sl.quantity, sl.reserved_quantity,
              sl.average_cost_sen, w.name as warehouse_name, p.name as product_name
       FROM "${tenantSchema}".stock_levels sl
       JOIN "${tenantSchema}".warehouses w ON w.id = sl.warehouse_id
       JOIN "${tenantSchema}".products p ON p.id = sl.product_id
       WHERE sl.product_id = $1::uuid`,
      productId,
    )
  }

  async recordMovement(tenantSchema: string, dto: StockMovementDto, userId: string) {
    if (dto.quantity <= 0) throw new BadRequestException('Quantity must be greater than 0')

    const movementNo = `MOV-${Date.now()}`
    const totalCostSen = Math.round((dto.unitCostSen ?? 0) * dto.quantity)

    return await this.prisma.$transaction(async (tx) => {
      // Insert movement record
      await tx.$queryRawUnsafe(
        `INSERT INTO "${tenantSchema}".stock_movements
           (movement_no, type, product_id, warehouse_id, dest_warehouse_id,
            quantity, unit_cost_sen, total_cost_sen, reference_type, reference_id,
            notes, created_by)
         VALUES ($1,$2,$3::uuid,$4::uuid,$5::uuid,$6,$7,$8,$9,$10::uuid,$11,$12::uuid)`,
        movementNo, dto.type, dto.productId, dto.warehouseId,
        dto.destWarehouseId ?? null, dto.quantity,
        dto.unitCostSen ?? 0, totalCostSen,
        dto.referenceType ?? null, dto.referenceId ?? null,
        dto.notes ?? null, userId,
      )

      // Update stock levels
      const isIncoming = ['RECEIVE', 'TRANSFER_IN', 'ADJUSTMENT'].includes(dto.type) ||
                         (dto.type === 'ADJUSTMENT' && dto.quantity > 0)
      const quantityChange = isIncoming ? dto.quantity : -dto.quantity

      // Upsert stock level
      await tx.$queryRawUnsafe(
        `INSERT INTO "${tenantSchema}".stock_levels (product_id, warehouse_id, quantity)
         VALUES ($1::uuid, $2::uuid, $3)
         ON CONFLICT (product_id, warehouse_id)
         DO UPDATE SET
           quantity = GREATEST(0, "${tenantSchema}".stock_levels.quantity + $3),
           updated_at = NOW()`,
        dto.productId, dto.warehouseId, quantityChange,
      )

      // If transfer, also update destination warehouse
      if (dto.type === 'TRANSFER_OUT' && dto.destWarehouseId) {
        await tx.$queryRawUnsafe(
          `INSERT INTO "${tenantSchema}".stock_levels (product_id, warehouse_id, quantity)
           VALUES ($1::uuid, $2::uuid, $3)
           ON CONFLICT (product_id, warehouse_id)
           DO UPDATE SET
             quantity = "${tenantSchema}".stock_levels.quantity + $3,
             updated_at = NOW()`,
          dto.productId, dto.destWarehouseId, dto.quantity,
        )
      }

      return { movementNo, success: true }
    })
  }

  async findAllMovements(tenantSchema: string, productId?: string, type?: string) {
    const conditions: string[] = []
    const params: unknown[] = []
    let idx = 1

    if (productId) {
      conditions.push(`sm.product_id = $${idx++}::uuid`)
      params.push(productId)
    }
    if (type) {
      conditions.push(`sm.type = $${idx++}`)
      params.push(type)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    return this.prisma.$queryRawUnsafe(
      `SELECT sm.id, sm.movement_no, sm.type, sm.quantity, sm.unit_cost_sen,
              sm.notes, sm.created_at,
              p.name as product_name, p.sku,
              w.name as warehouse_name
       FROM "${tenantSchema}".stock_movements sm
       JOIN "${tenantSchema}".products p ON p.id = sm.product_id
       JOIN "${tenantSchema}".warehouses w ON w.id = sm.warehouse_id
       ${where}
       ORDER BY sm.created_at DESC
       LIMIT 200`,
      ...params,
    )
  }

  async getLowStockProducts(tenantSchema: string) {
    return this.prisma.$queryRawUnsafe(
      `SELECT p.id, p.name, p.sku, p.reorder_point,
              COALESCE(SUM(sl.quantity), 0) as total_stock
       FROM "${tenantSchema}".products p
       LEFT JOIN "${tenantSchema}".stock_levels sl ON sl.product_id = p.id
       WHERE p.track_inventory = TRUE AND p.deleted_at IS NULL
       GROUP BY p.id
       HAVING COALESCE(SUM(sl.quantity), 0) <= p.reorder_point
       ORDER BY p.name`,
    )
  }
}
