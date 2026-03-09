import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface QuotationLineInput {
  productId?: string
  description: string
  quantity: number
  unitPriceSen: number
  discountPercent?: number
  sstRate?: number
}

export interface CreateQuotationDto {
  contactId: string
  opportunityId?: string
  issueDate: string
  expiryDate?: string
  notes?: string
  terms?: string
  lines: QuotationLineInput[]
}

@Injectable()
export class QuotationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantSchema: string, status?: string) {
    const statusFilter = status ? `AND q.status = '${status}'` : ''
    return this.prisma.$queryRawUnsafe(
      `SELECT q.id, q.quotation_no, q.issue_date, q.expiry_date, q.status,
              q.total_sen, q.currency, c.name AS contact_name
       FROM "${tenantSchema}".quotations q
       JOIN "${tenantSchema}".contacts c ON c.id = q.contact_id
       WHERE q.deleted_at IS NULL ${statusFilter}
       ORDER BY q.created_at DESC`,
    )
  }

  async findOne(tenantSchema: string, id: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT q.*, c.name AS contact_name, c.email AS contact_email, c.address_line1, c.city, c.state
       FROM "${tenantSchema}".quotations q
       JOIN "${tenantSchema}".contacts c ON c.id = q.contact_id
       WHERE q.id = $1::uuid AND q.deleted_at IS NULL`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Quotation not found')
    const lines = await this.prisma.$queryRawUnsafe(
      `SELECT * FROM "${tenantSchema}".quotation_lines WHERE quotation_id = $1::uuid ORDER BY sort_order`,
      id,
    )
    return { ...rows[0], lines }
  }

  async create(tenantSchema: string, dto: CreateQuotationDto, userId: string, tenantId: string) {
    const settingsRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT "quotePrefix", "quoteNextNumber" FROM public.tenant_settings WHERE "tenantId" = $1::uuid`,
      tenantId,
    )
    const prefix = settingsRows[0]?.quotePrefix ?? 'QT'
    const nextNum = Number(settingsRows[0]?.quoteNextNumber ?? 1)
    const quotationNo = `${prefix}-${String(nextNum).padStart(5, '0')}`

    let subtotalSen = 0
    let sstAmountSen = 0
    for (const line of dto.lines) {
      const disc = 1 - (line.discountPercent ?? 0) / 100
      const lineSubtotal = Math.round(line.quantity * line.unitPriceSen * disc)
      const lineSst = Math.round(lineSubtotal * (line.sstRate ?? 0) / 100)
      subtotalSen += lineSubtotal
      sstAmountSen += lineSst
    }
    const totalSen = subtotalSen + sstAmountSen

    return await this.prisma.$transaction(async (tx) => {
      const qRows = await tx.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "${tenantSchema}".quotations
           (quotation_no, contact_id, opportunity_id, issue_date, expiry_date,
            subtotal_sen, sst_amount_sen, total_sen, notes, terms, created_by)
         VALUES ($1,$2::uuid,$3::uuid,$4::date,$5::date,$6,$7,$8,$9,$10,$11::uuid)
         RETURNING id`,
        quotationNo, dto.contactId, dto.opportunityId ?? null,
        dto.issueDate, dto.expiryDate ?? null,
        subtotalSen, sstAmountSen, totalSen,
        dto.notes ?? null, dto.terms ?? null, userId,
      )
      const quotationId = qRows[0].id

      for (let i = 0; i < dto.lines.length; i++) {
        const line = dto.lines[i]
        const disc = 1 - (line.discountPercent ?? 0) / 100
        const lineSubtotal = Math.round(line.quantity * line.unitPriceSen * disc)
        const lineSst = Math.round(lineSubtotal * (line.sstRate ?? 0) / 100)
        await tx.$queryRawUnsafe(
          `INSERT INTO "${tenantSchema}".quotation_lines
             (quotation_id, product_id, description, quantity, unit_price_sen,
              discount_percent, subtotal_sen, sst_rate, sst_amount_sen, total_sen, sort_order)
           VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          quotationId, line.productId ?? null, line.description,
          line.quantity, line.unitPriceSen, line.discountPercent ?? 0,
          lineSubtotal, line.sstRate ?? 0, lineSst, lineSubtotal + lineSst, i,
        )
      }

      await tx.$queryRawUnsafe(
        `UPDATE public.tenant_settings SET "quoteNextNumber" = "quoteNextNumber" + 1
         WHERE "tenantId" = $1::uuid`,
        tenantId,
      )

      return { id: quotationId, quotationNo, totalSen }
    })
  }

  async updateStatus(tenantSchema: string, id: string, status: string) {
    await this.prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".quotations SET status = $1, updated_at = NOW()
       WHERE id = $2::uuid AND deleted_at IS NULL`,
      status, id,
    )
    return this.findOne(tenantSchema, id)
  }

  async convertToInvoice(tenantSchema: string, id: string) {
    const quotation = await this.findOne(tenantSchema, id)
    return { quotation, message: 'Use invoice creation form with this quotation data' }
  }
}
