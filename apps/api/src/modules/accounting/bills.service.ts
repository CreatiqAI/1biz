import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface BillLineInput {
  accountId?: string
  productId?: string
  description: string
  quantity: number
  unitPriceSen: number
  discountPercent?: number
  sstRate?: number
}

export interface CreateBillDto {
  contactId: string
  billDate: string
  dueDate?: string
  type?: 'BILL' | 'DEBIT_NOTE' | 'CREDIT_NOTE'
  currency?: string
  exchangeRate?: number
  reference?: string
  notes?: string
  lines: BillLineInput[]
}

export interface RecordBillPaymentDto {
  date: string
  amountSen: number
  method?: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'DUITNOW' | 'TNG' | 'GRABPAY' | 'CARD'
  reference?: string
  notes?: string
}

@Injectable()
export class BillsService {
  private readonly logger = new Logger(BillsService.name)

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantSchema: string, status?: string) {
    const statusFilter = status ? `AND b.status = '${status}'` : ''
    return this.prisma.$queryRawUnsafe(
      `SELECT b.id, b.bill_no, b.type, b.bill_date, b.due_date, b.status,
              b.subtotal_sen, b.sst_amount_sen, b.total_sen, b.paid_sen,
              b.balance_sen, b.currency, b.reference,
              c.name as contact_name
       FROM "${tenantSchema}".bills b
       JOIN "${tenantSchema}".contacts c ON c.id = b.contact_id
       WHERE b.deleted_at IS NULL ${statusFilter}
       ORDER BY b.bill_date DESC`,
    )
  }

  async findOne(tenantSchema: string, id: string) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT b.*, c.name as contact_name, c.email as contact_email,
              c.address_line1, c.city, c.state, c.postcode
       FROM "${tenantSchema}".bills b
       JOIN "${tenantSchema}".contacts c ON c.id = b.contact_id
       WHERE b.id = $1::uuid AND b.deleted_at IS NULL`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Bill not found')

    const lines = await this.prisma.$queryRawUnsafe(
      `SELECT bl.*, a.name as account_name, a.code as account_code
       FROM "${tenantSchema}".bill_lines bl
       LEFT JOIN "${tenantSchema}".accounts a ON a.id = bl.account_id
       WHERE bl.bill_id = $1::uuid
       ORDER BY bl.sort_order`,
      id,
    )

    const allocations = await this.prisma.$queryRawUnsafe(
      `SELECT ba.id, ba.payment_id, ba.amount_sen, ba.created_at,
              p.payment_no, p.date as payment_date, p.method
       FROM "${tenantSchema}".bill_allocations ba
       JOIN "${tenantSchema}".payments p ON p.id = ba.payment_id
       WHERE ba.bill_id = $1::uuid
       ORDER BY ba.created_at`,
      id,
    )

    return { ...rows[0], lines, allocations }
  }

  async create(tenantSchema: string, dto: CreateBillDto, userId: string) {
    // Generate bill number: BILL-YYYYMM-XXXXX
    const now = new Date()
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const countRows = await this.prisma.$queryRawUnsafe<{ cnt: string }[]>(
      `SELECT COUNT(*) AS cnt FROM "${tenantSchema}".bills WHERE deleted_at IS NULL`,
    )
    const count = Number(countRows[0]?.cnt ?? 0) + 1
    const billNo = `BILL-${yyyymm}-${String(count).padStart(5, '0')}`

    // Calculate totals from line items
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
      // Create bill
      const billRows = await tx.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "${tenantSchema}".bills
           (bill_no, type, contact_id, bill_date, due_date, status,
            currency, exchange_rate, subtotal_sen, sst_amount_sen, total_sen,
            balance_sen, reference, notes, created_by)
         VALUES ($1,$2,$3::uuid,$4::date,$5::date,'DRAFT',
                 $6,$7,$8,$9,$10,$10,$11,$12,$13::uuid)
         RETURNING id`,
        billNo,
        dto.type ?? 'BILL',
        dto.contactId,
        dto.billDate,
        dto.dueDate ?? null,
        dto.currency ?? 'MYR',
        dto.exchangeRate ?? 1,
        subtotalSen,
        sstAmountSen,
        totalSen,
        dto.reference ?? null,
        dto.notes ?? null,
        userId,
      )
      const billId = billRows[0].id

      // Create bill lines
      for (let i = 0; i < dto.lines.length; i++) {
        const line = dto.lines[i]
        const discountFactor = 1 - (line.discountPercent ?? 0) / 100
        const lineSubtotal = Math.round(line.quantity * line.unitPriceSen * discountFactor)
        const lineSst = Math.round(lineSubtotal * (line.sstRate ?? 0) / 100)
        const lineTotal = lineSubtotal + lineSst

        await tx.$queryRawUnsafe(
          `INSERT INTO "${tenantSchema}".bill_lines
             (bill_id, account_id, product_id, description, quantity,
              unit_price_sen, discount_percent, subtotal_sen, sst_rate,
              sst_amount_sen, total_sen, sort_order)
           VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          billId,
          line.accountId ?? null,
          line.productId ?? null,
          line.description,
          line.quantity,
          line.unitPriceSen,
          line.discountPercent ?? 0,
          lineSubtotal,
          line.sstRate ?? 0,
          lineSst,
          lineTotal,
          i,
        )
      }

      return { id: billId, billNo, totalSen }
    })

    return result
  }

  async approve(tenantSchema: string, id: string, userId: string) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: string; status: string }[]>(
      `SELECT id, status FROM "${tenantSchema}".bills
       WHERE id = $1::uuid AND deleted_at IS NULL`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Bill not found')

    const bill = rows[0]
    if (bill.status !== 'DRAFT' && bill.status !== 'PENDING') {
      throw new BadRequestException(`Cannot approve bill with status ${bill.status}`)
    }

    await this.prisma.$queryRawUnsafe(
      `UPDATE "${tenantSchema}".bills
       SET status = 'APPROVED', approved_by = $1::uuid, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2::uuid`,
      userId,
      id,
    )

    return this.findOne(tenantSchema, id)
  }

  async recordPayment(tenantSchema: string, billId: string, dto: RecordBillPaymentDto, userId: string) {
    // Verify bill exists and is payable
    const billRows = await this.prisma.$queryRawUnsafe<{
      id: string
      status: string
      contact_id: string
      balance_sen: string
    }[]>(
      `SELECT id, status, contact_id, balance_sen
       FROM "${tenantSchema}".bills
       WHERE id = $1::uuid AND deleted_at IS NULL`,
      billId,
    )
    if (!billRows.length) throw new NotFoundException('Bill not found')

    const bill = billRows[0]
    const balanceSen = Number(bill.balance_sen)

    if (bill.status === 'PAID') {
      throw new BadRequestException('Bill is already fully paid')
    }
    if (bill.status === 'CANCELLED' || bill.status === 'DRAFT') {
      throw new BadRequestException(`Cannot record payment for bill with status ${bill.status}`)
    }
    if (dto.amountSen <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero')
    }
    if (dto.amountSen > balanceSen) {
      throw new BadRequestException(`Payment amount (${dto.amountSen}) exceeds bill balance (${balanceSen})`)
    }

    return await this.prisma.$transaction(async (tx) => {
      // Generate payment number
      const countRows = await tx.$queryRawUnsafe<{ cnt: string }[]>(
        `SELECT COUNT(*) AS cnt FROM "${tenantSchema}".payments WHERE deleted_at IS NULL`,
      )
      const count = Number(countRows[0]?.cnt ?? 0) + 1
      const paymentNo = `PAY-${String(count).padStart(5, '0')}`

      // Create payment record (type = MADE for bills)
      const paymentRows = await tx.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "${tenantSchema}".payments
           (payment_no, type, contact_id, date, amount_sen, method, reference, notes, created_by)
         VALUES ($1,'MADE',$2::uuid,$3::date,$4,$5,$6,$7,$8::uuid)
         RETURNING id`,
        paymentNo,
        bill.contact_id,
        dto.date,
        dto.amountSen,
        dto.method ?? null,
        dto.reference ?? null,
        dto.notes ?? null,
        userId,
      )
      const paymentId = paymentRows[0].id

      // Create bill allocation
      await tx.$queryRawUnsafe(
        `INSERT INTO "${tenantSchema}".bill_allocations (payment_id, bill_id, amount_sen)
         VALUES ($1::uuid, $2::uuid, $3)`,
        paymentId,
        billId,
        dto.amountSen,
      )

      // Update bill paid_sen, balance_sen, and status
      await tx.$queryRawUnsafe(
        `UPDATE "${tenantSchema}".bills
         SET paid_sen = paid_sen + $1,
             balance_sen = GREATEST(balance_sen - $1, 0),
             status = CASE
               WHEN balance_sen - $1 <= 0 THEN 'PAID'
               WHEN paid_sen + $1 > 0 THEN 'PARTIAL'
               ELSE status
             END,
             updated_at = NOW()
         WHERE id = $2::uuid AND deleted_at IS NULL`,
        dto.amountSen,
        billId,
      )

      return { paymentId, paymentNo, amountSen: dto.amountSen }
    })
  }

  async updateStatus(tenantSchema: string, id: string, status: string) {
    const validStatuses = ['DRAFT', 'PENDING', 'APPROVED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`)
    }

    const rows = await this.prisma.$queryRawUnsafe<{ id: string; status: string }[]>(
      `SELECT id, status FROM "${tenantSchema}".bills
       WHERE id = $1::uuid AND deleted_at IS NULL`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Bill not found')

    await this.prisma.$queryRawUnsafe(
      `UPDATE "${tenantSchema}".bills SET status = $1, updated_at = NOW()
       WHERE id = $2::uuid AND deleted_at IS NULL`,
      status,
      id,
    )

    return this.findOne(tenantSchema, id)
  }

  async delete(tenantSchema: string, id: string) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: string; status: string }[]>(
      `SELECT id, status FROM "${tenantSchema}".bills
       WHERE id = $1::uuid AND deleted_at IS NULL`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Bill not found')

    if (rows[0].status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT bills can be deleted')
    }

    await this.prisma.$queryRawUnsafe(
      `UPDATE "${tenantSchema}".bills SET deleted_at = NOW() WHERE id = $1::uuid`,
      id,
    )

    return { id, deleted: true }
  }
}
