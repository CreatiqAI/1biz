import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { StockService } from '../inventory/stock.service'

export interface InvoiceLineInput {
  productId?: string
  description: string
  quantity: number
  unitPriceSen: number
  discountPercent?: number
  sstRate?: number
  accountId?: string
}

export interface CreateInvoiceDto {
  contactId: string
  issueDate: string
  dueDate?: string
  currency?: string
  sstType?: 'SERVICE' | 'SALES' | 'EXEMPT'
  sstRate?: number
  notes?: string
  terms?: string
  lines: InvoiceLineInput[]
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
  ) {}

  async findAll(tenantSchema: string, status?: string, search?: string, page = 1, limit = 25) {
    limit = Math.min(Math.max(limit, 1), 10000)
    const params: any[] = []
    const conditions = ['i.deleted_at IS NULL']
    let paramIdx = 0

    if (status) {
      paramIdx++
      conditions.push(`i.status = $${paramIdx}`)
      params.push(status)
    }
    if (search) {
      paramIdx++
      conditions.push(`(i.invoice_no ILIKE $${paramIdx} OR c.name ILIKE $${paramIdx})`)
      params.push(`%${search}%`)
    }

    const where = conditions.join(' AND ')
    const offset = (page - 1) * limit

    const countRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*) as cnt FROM "${tenantSchema}".invoices i
       JOIN "${tenantSchema}".contacts c ON c.id = i.contact_id
       WHERE ${where}`,
      ...params,
    )
    const total = Number(countRows[0]?.cnt ?? 0)

    paramIdx++
    const limitParam = paramIdx
    paramIdx++
    const offsetParam = paramIdx

    const data = await this.prisma.$queryRawUnsafe(
      `SELECT i.id, i.invoice_no, i.issue_date, i.due_date, i.status,
              i.total_sen, i.paid_sen, i.balance_sen, i.currency,
              c.name as contact_name
       FROM "${tenantSchema}".invoices i
       JOIN "${tenantSchema}".contacts c ON c.id = i.contact_id
       WHERE ${where}
       ORDER BY i.issue_date DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      ...params, limit, offset,
    )

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async findOne(tenantSchema: string, id: string) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT i.*, c.name as contact_name, c.email as contact_email,
              c.address_line1, c.city, c.state, c.postcode
       FROM "${tenantSchema}".invoices i
       JOIN "${tenantSchema}".contacts c ON c.id = i.contact_id
       WHERE i.id = $1::uuid AND i.deleted_at IS NULL`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Invoice not found')

    const lines = await this.prisma.$queryRawUnsafe(
      `SELECT * FROM "${tenantSchema}".invoice_lines WHERE invoice_id = $1::uuid ORDER BY sort_order`,
      id,
    )

    return { ...rows[0], lines }
  }

  async create(tenantSchema: string, dto: CreateInvoiceDto, userId: string, tenantId: string) {
    // Calculate totals
    let subtotalSen = 0
    let sstAmountSen = 0

    for (const line of dto.lines) {
      const discountFactor = 1 - (line.discountPercent ?? 0) / 100
      const lineSubtotal = Math.round(line.quantity * line.unitPriceSen * discountFactor)
      const lineSst = Math.round(lineSubtotal * (line.sstRate ?? 0) / 100)
      subtotalSen += lineSubtotal
      sstAmountSen += lineSst
    }

    const totalSen = subtotalSen + sstAmountSen

    const result = await this.prisma.$transaction(async (tx) => {
      // Lock + read settings inside transaction to prevent race condition
      const settingsRows = await tx.$queryRawUnsafe<{
        invoicePrefix: string
        invoiceNextNumber: number
      }[]>(
        `SELECT "invoicePrefix", "invoiceNextNumber" FROM public.tenant_settings WHERE "tenantId" = $1 FOR UPDATE`,
        tenantId,
      )
      const settings = settingsRows[0]
      const invoiceNo = `${settings.invoicePrefix}-${String(settings.invoiceNextNumber).padStart(5, '0')}`

      // Create invoice
      const invoiceRows = await tx.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "${tenantSchema}".invoices
           (invoice_no, type, contact_id, issue_date, due_date, status,
            currency, subtotal_sen, sst_amount_sen, total_sen, balance_sen,
            sst_type, sst_rate, notes, terms, created_by)
         VALUES ($1,'INVOICE',$2::uuid,$3::date,$4::date,'DRAFT',$5,$6,$7,$8,$8,$9,$10,$11,$12,$13::uuid)
         RETURNING id`,
        invoiceNo, dto.contactId, dto.issueDate, dto.dueDate ?? null,
        dto.currency ?? 'MYR', subtotalSen, sstAmountSen, totalSen,
        dto.sstType ?? null, dto.sstRate ?? null, dto.notes ?? null,
        dto.terms ?? null, userId,
      )
      const invoiceId = invoiceRows[0].id

      // Create invoice lines
      for (let i = 0; i < dto.lines.length; i++) {
        const line = dto.lines[i]
        const discountFactor = 1 - (line.discountPercent ?? 0) / 100
        const lineSubtotal = Math.round(line.quantity * line.unitPriceSen * discountFactor)
        const lineSst = Math.round(lineSubtotal * (line.sstRate ?? 0) / 100)
        const lineTotal = lineSubtotal + lineSst

        await tx.$queryRawUnsafe(
          `INSERT INTO "${tenantSchema}".invoice_lines
             (invoice_id, product_id, description, quantity, unit_price_sen,
              discount_percent, subtotal_sen, sst_rate, sst_amount_sen, total_sen,
              account_id, sort_order)
           VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11::uuid,$12)`,
          invoiceId, line.productId ?? null, line.description,
          line.quantity, line.unitPriceSen, line.discountPercent ?? 0,
          lineSubtotal, line.sstRate ?? 0, lineSst, lineTotal,
          line.accountId ?? null, i,
        )
      }

      // Increment invoice counter
      await tx.$queryRawUnsafe(
        `UPDATE public.tenant_settings
         SET "invoiceNextNumber" = "invoiceNextNumber" + 1
         WHERE "tenantId" = $1`,
        tenantId,
      )

      return { id: invoiceId, invoiceNo, totalSen }
    })

    // Deduct stock for product lines (outside transaction — stock has its own)
    const stockWarnings = await this.deductStockForInvoice(tenantSchema, result.id, dto.lines, userId)

    return { ...result, stockWarnings }
  }

  /** Deduct stock for each invoice line that has a tracked product. Returns warnings for failed deductions. */
  private async deductStockForInvoice(
    tenantSchema: string,
    invoiceId: string,
    lines: InvoiceLineInput[],
    userId: string,
  ): Promise<string[]> {
    const warnings: string[] = []
    const productLines = lines.filter((l) => l.productId)
    if (!productLines.length) return warnings

    // Get default warehouse
    const defaultWarehouse = await this.getDefaultWarehouse(tenantSchema)
    if (!defaultWarehouse) {
      this.logger.warn('No default warehouse found — skipping stock deduction')
      warnings.push('No warehouse found — stock was not deducted')
      return warnings
    }

    for (const line of productLines) {
      // Check if this product tracks inventory
      const tracked = await this.isProductTracked(tenantSchema, line.productId!)
      if (!tracked) continue

      try {
        await this.stockService.recordMovement(tenantSchema, {
          type: 'ISSUE',
          productId: line.productId!,
          warehouseId: defaultWarehouse,
          quantity: line.quantity,
          referenceType: 'INVOICE',
          referenceId: invoiceId,
          notes: `Auto-deducted from invoice`,
        }, userId)
      } catch (err) {
        this.logger.error(`Failed to deduct stock for product ${line.productId}: ${err}`)
        warnings.push(`Stock deduction failed for product ${line.productId}: ${String(err)}`)
      }
    }
    return warnings
  }

  async updateStatus(tenantSchema: string, id: string, status: string, userId?: string) {
    const validStatuses = ['DRAFT', 'SENT', 'CANCELLED']
    if (!validStatuses.includes(status)) throw new BadRequestException('Invalid status')

    // Get current status before updating
    const currentRows = await this.prisma.$queryRawUnsafe<{ status: string }[]>(
      `SELECT status FROM "${tenantSchema}".invoices WHERE id = $1::uuid AND deleted_at IS NULL`,
      id,
    )
    if (!currentRows.length) throw new NotFoundException('Invoice not found')
    const previousStatus = currentRows[0].status

    await this.prisma.$queryRawUnsafe(
      `UPDATE "${tenantSchema}".invoices SET status = $1, updated_at = NOW()
       WHERE id = $2::uuid AND deleted_at IS NULL`,
      status, id,
    )

    // Restock when cancelling a non-cancelled invoice
    if (status === 'CANCELLED' && previousStatus !== 'CANCELLED' && userId) {
      await this.restockForCancelledInvoice(tenantSchema, id, userId)
    }

    return this.findOne(tenantSchema, id)
  }

  /** Restock inventory for a cancelled invoice */
  private async restockForCancelledInvoice(
    tenantSchema: string,
    invoiceId: string,
    userId: string,
  ) {
    // Get invoice lines with product_id
    const lines = await this.prisma.$queryRawUnsafe<{
      product_id: string | null
      quantity: number
    }[]>(
      `SELECT product_id, quantity FROM "${tenantSchema}".invoice_lines
       WHERE invoice_id = $1::uuid AND product_id IS NOT NULL`,
      invoiceId,
    )
    if (!lines.length) return

    const defaultWarehouse = await this.getDefaultWarehouse(tenantSchema)
    if (!defaultWarehouse) {
      this.logger.warn('No default warehouse found — skipping restock')
      return
    }

    for (const line of lines) {
      const tracked = await this.isProductTracked(tenantSchema, line.product_id!)
      if (!tracked) continue

      try {
        await this.stockService.recordMovement(tenantSchema, {
          type: 'RECEIVE',
          productId: line.product_id!,
          warehouseId: defaultWarehouse,
          quantity: Number(line.quantity),
          referenceType: 'INVOICE_CANCEL',
          referenceId: invoiceId,
          notes: 'Auto-restocked from cancelled invoice',
        }, userId)
      } catch (err) {
        this.logger.error(`Failed to restock product ${line.product_id}: ${err}`)
      }
    }
  }

  /** Get the default warehouse ID for this tenant */
  private async getDefaultWarehouse(tenantSchema: string): Promise<string | null> {
    const rows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${tenantSchema}".warehouses
       WHERE is_default = TRUE AND deleted_at IS NULL
       LIMIT 1`,
    )
    if (rows.length) return rows[0].id

    // Fallback: first warehouse
    const fallback = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${tenantSchema}".warehouses
       WHERE deleted_at IS NULL
       ORDER BY created_at ASC LIMIT 1`,
    )
    return fallback.length ? fallback[0].id : null
  }

  /** Check if a product has track_inventory enabled */
  private async isProductTracked(tenantSchema: string, productId: string): Promise<boolean> {
    const rows = await this.prisma.$queryRawUnsafe<{ track_inventory: boolean }[]>(
      `SELECT track_inventory FROM "${tenantSchema}".products
       WHERE id = $1::uuid AND deleted_at IS NULL`,
      productId,
    )
    return rows.length > 0 && rows[0].track_inventory
  }

  /**
   * Create a Credit Note or Debit Note linked to an original invoice.
   * Credit Note: reduces customer balance (refund/discount)
   * Debit Note: increases customer balance (additional charges)
   */
  async createCreditDebitNote(
    tenantSchema: string,
    originalInvoiceId: string,
    type: 'CREDIT_NOTE' | 'DEBIT_NOTE',
    dto: { reason: string; lines: InvoiceLineInput[] },
    userId: string,
    tenantId: string,
  ) {
    // Verify original invoice exists
    const origRows = await this.prisma.$queryRawUnsafe<{ id: string; contact_id: string; currency: string; balance_sen: string; invoice_no: string }[]>(
      `SELECT id, contact_id, currency, balance_sen::text, invoice_no FROM "${tenantSchema}".invoices
       WHERE id = $1::uuid AND deleted_at IS NULL`,
      originalInvoiceId,
    )
    if (!origRows.length) throw new NotFoundException('Original invoice not found')
    const orig = origRows[0]

    // Generate number
    const prefix = type === 'CREDIT_NOTE' ? 'CN' : 'DN'
    const countRows = await this.prisma.$queryRawUnsafe<{ count: string }[]>(
      `SELECT COUNT(*)::text as count FROM "${tenantSchema}".invoices WHERE type = $1`,
      type,
    )
    const seq = String(Number(countRows[0].count) + 1).padStart(5, '0')
    const now = new Date()
    const noteNo = `${prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${seq}`

    // Calculate totals
    let subtotalSen = 0
    let sstAmountSen = 0
    for (const line of dto.lines) {
      const discountFactor = 1 - (line.discountPercent ?? 0) / 100
      const lineSubtotal = Math.round(line.quantity * line.unitPriceSen * discountFactor)
      const lineSst = Math.round(lineSubtotal * (line.sstRate ?? 0) / 100)
      subtotalSen += lineSubtotal
      sstAmountSen += lineSst
    }
    const totalSen = subtotalSen + sstAmountSen

    const result = await this.prisma.$transaction(async (tx) => {
      // Create the CN/DN record
      const noteRows = await tx.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "${tenantSchema}".invoices
           (invoice_no, type, contact_id, issue_date, status, currency,
            subtotal_sen, sst_amount_sen, total_sen, balance_sen,
            notes, created_by)
         VALUES ($1,$2,$3::uuid,$4::date,'SENT',$5,$6,$7,$8,$8,$9,$10::uuid)
         RETURNING id`,
        noteNo, type, orig.contact_id, now.toISOString().split('T')[0],
        orig.currency, subtotalSen, sstAmountSen, totalSen,
        `${type === 'CREDIT_NOTE' ? 'Credit Note' : 'Debit Note'} for ${orig.invoice_no}: ${dto.reason}`,
        userId,
      )
      const noteId = noteRows[0].id

      // Create line items
      for (let i = 0; i < dto.lines.length; i++) {
        const line = dto.lines[i]
        const discountFactor = 1 - (line.discountPercent ?? 0) / 100
        const lineSubtotal = Math.round(line.quantity * line.unitPriceSen * discountFactor)
        const lineSst = Math.round(lineSubtotal * (line.sstRate ?? 0) / 100)
        const lineTotal = lineSubtotal + lineSst

        await tx.$queryRawUnsafe(
          `INSERT INTO "${tenantSchema}".invoice_lines
             (invoice_id, product_id, description, quantity, unit_price_sen,
              discount_percent, subtotal_sen, sst_rate, sst_amount_sen, total_sen,
              account_id, sort_order)
           VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11::uuid,$12)`,
          noteId, line.productId ?? null, line.description,
          line.quantity, line.unitPriceSen, line.discountPercent ?? 0,
          lineSubtotal, line.sstRate ?? 0, lineSst, lineTotal,
          line.accountId ?? null, i,
        )
      }

      // For Credit Notes: reduce original invoice balance
      if (type === 'CREDIT_NOTE') {
        const currentBalance = BigInt(orig.balance_sen)
        const creditAmount = BigInt(totalSen)
        const newBalance = currentBalance - creditAmount < 0n ? 0n : currentBalance - creditAmount
        const newPaid = BigInt(totalSen) // credit note counts as "payment"
        const newStatus = newBalance <= 0n ? 'PAID' : 'PARTIAL'

        await tx.$queryRawUnsafe(
          `UPDATE "${tenantSchema}".invoices
           SET paid_sen = paid_sen + $1, balance_sen = $2, status = $3, updated_at = NOW()
           WHERE id = $4::uuid`,
          Number(creditAmount), Number(newBalance), newStatus, originalInvoiceId,
        )
      }

      return { id: noteId, noteNo, type, totalSen, originalInvoiceId }
    })

    return result
  }
}
