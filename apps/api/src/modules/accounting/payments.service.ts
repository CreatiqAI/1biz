import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface RecordPaymentDto {
  type: 'RECEIVED' | 'MADE'
  contactId: string
  date: string
  amountSen: number
  method?: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'DUITNOW' | 'TNG' | 'GRABPAY' | 'CARD'
  reference?: string
  notes?: string
  invoiceId?: string
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantSchema: string, type?: string, page = 1, limit = 25) {
    limit = Math.min(Math.max(limit, 1), 500)
    const params: any[] = []
    const conditions = ['p.deleted_at IS NULL']
    let paramIdx = 0

    if (type) {
      paramIdx++
      conditions.push(`p.type = $${paramIdx}`)
      params.push(type)
    }

    const where = conditions.join(' AND ')
    const offset = (page - 1) * limit

    const countRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*) as cnt FROM "${tenantSchema}".payments p WHERE ${where}`,
      ...params,
    )
    const total = Number(countRows[0]?.cnt ?? 0)

    paramIdx++
    const limitParam = paramIdx
    paramIdx++
    const offsetParam = paramIdx

    const data = await this.prisma.$queryRawUnsafe(
      `SELECT p.id, p.payment_no, p.type, p.date, p.amount_sen,
              p.method, p.reference, p.notes,
              c.name AS contact_name
       FROM "${tenantSchema}".payments p
       JOIN "${tenantSchema}".contacts c ON c.id = p.contact_id
       WHERE ${where}
       ORDER BY p.date DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      ...params, limit, offset,
    )

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async create(tenantSchema: string, dto: RecordPaymentDto, userId: string) {
    const countRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*) AS cnt FROM "${tenantSchema}".payments WHERE deleted_at IS NULL`,
    )
    const count = Number(countRows[0]?.cnt ?? 0) + 1
    const paymentNo = `PAY-${String(count).padStart(5, '0')}`

    return await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "${tenantSchema}".payments
           (payment_no, type, contact_id, date, amount_sen, method, reference, notes, created_by)
         VALUES ($1,$2,$3::uuid,$4::date,$5,$6,$7,$8,$9::uuid)
         RETURNING id`,
        paymentNo, dto.type, dto.contactId, dto.date, dto.amountSen,
        dto.method ?? null, dto.reference ?? null, dto.notes ?? null, userId,
      )
      const paymentId = rows[0].id

      if (dto.invoiceId) {
        await tx.$queryRawUnsafe(
          `INSERT INTO "${tenantSchema}".payment_allocations (payment_id, invoice_id, amount_sen)
           VALUES ($1::uuid, $2::uuid, $3)`,
          paymentId, dto.invoiceId, dto.amountSen,
        )
        await tx.$queryRawUnsafe(
          `UPDATE "${tenantSchema}".invoices
           SET paid_sen = paid_sen + $1,
               balance_sen = GREATEST(balance_sen - $1, 0),
               status = CASE
                 WHEN balance_sen - $1 <= 0 THEN 'PAID'
                 WHEN paid_sen + $1 > 0 THEN 'PARTIAL'
                 ELSE status
               END,
               updated_at = NOW()
           WHERE id = $2::uuid AND deleted_at IS NULL`,
          dto.amountSen, dto.invoiceId,
        )
      }

      return { id: paymentId, paymentNo }
    })
  }
}
