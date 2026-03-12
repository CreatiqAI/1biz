import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface CreateObligationDto {
  type: string
  title: string
  dueDate: string
  period?: string
  status?: string
  notes?: string
}

export interface ObligationRow {
  id: string
  type: string
  title: string
  due_date: Date
  period: string | null
  status: string
  completed_at: Date | null
  completed_by: string | null
  notes: string | null
  created_at: Date
  updated_at: Date
}

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  async getObligations(tenantSchema: string, year?: number, month?: number, status?: string) {
    const conditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (year) {
      conditions.push(`EXTRACT(YEAR FROM co.due_date) = $${paramIndex}`)
      params.push(year)
      paramIndex++
    }
    if (month) {
      conditions.push(`EXTRACT(MONTH FROM co.due_date) = $${paramIndex}`)
      params.push(month)
      paramIndex++
    }
    if (status) {
      conditions.push(`co.status = $${paramIndex}`)
      params.push(status)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const rows = await this.prisma.$queryRawUnsafe<ObligationRow[]>(
      `SELECT co.id, co.type, co.title, co.due_date, co.period, co.status,
              co.completed_at, co.completed_by, co.notes, co.created_at, co.updated_at
       FROM "${tenantSchema}".compliance_obligations co
       ${whereClause}
       ORDER BY co.due_date ASC`,
      ...params,
    )
    return rows
  }

  async createObligation(tenantSchema: string, dto: CreateObligationDto) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "${tenantSchema}".compliance_obligations
         (type, title, due_date, period, status, notes)
       VALUES ($1, $2, $3::date, $4, $5, $6)
       RETURNING id`,
      dto.type,
      dto.title,
      dto.dueDate,
      dto.period ?? null,
      dto.status ?? 'UPCOMING',
      dto.notes ?? null,
    )
    return rows[0]
  }

  async completeObligation(tenantSchema: string, id: string, userId: string) {
    const rows = await this.prisma.$queryRawUnsafe<ObligationRow[]>(
      `UPDATE "${tenantSchema}".compliance_obligations
       SET status = 'COMPLETED',
           completed_at = NOW(),
           completed_by = $1::uuid,
           updated_at = NOW()
       WHERE id = $2::uuid
       RETURNING id, type, title, due_date, period, status, completed_at, completed_by,
                 notes, created_at, updated_at`,
      userId,
      id,
    )
    if (!rows.length) throw new NotFoundException('Compliance obligation not found')
    return rows[0]
  }

  /**
   * Auto-generate standard monthly compliance obligations.
   *
   * Monthly obligations:
   * - EPF contribution due by 15th of the following month
   * - SOCSO contribution due by 15th of the following month
   * - EIS contribution due by 15th of the following month
   * - PCB/MTD due by 15th of the following month
   * - SST return (bimonthly: Jan-Feb, Mar-Apr, May-Jun, Jul-Aug, Sep-Oct, Nov-Dec)
   *   SST return is due by last day of the month following the bimonthly period end
   */
  async generateMonthlyObligations(tenantSchema: string, year: number, month: number) {
    const period = `${year}-${String(month).padStart(2, '0')}`

    // Calculate the due date for statutory contributions: 15th of the following month
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const dueDate15th = `${nextYear}-${String(nextMonth).padStart(2, '0')}-15`

    const obligations: CreateObligationDto[] = [
      {
        type: 'EPF',
        title: `EPF Contribution — ${period}`,
        dueDate: dueDate15th,
        period,
      },
      {
        type: 'SOCSO',
        title: `SOCSO Contribution — ${period}`,
        dueDate: dueDate15th,
        period,
      },
      {
        type: 'EIS',
        title: `EIS Contribution — ${period}`,
        dueDate: dueDate15th,
        period,
      },
      {
        type: 'PCB',
        title: `PCB/MTD Remittance — ${period}`,
        dueDate: dueDate15th,
        period,
      },
    ]

    // SST bimonthly return: periods are Jan-Feb, Mar-Apr, May-Jun, Jul-Aug, Sep-Oct, Nov-Dec
    // The return is due at the end of the month following the period end
    // e.g., Jan-Feb period -> due by 31 March
    const bimonthlyEndMonths = [2, 4, 6, 8, 10, 12]
    if (bimonthlyEndMonths.includes(month)) {
      const startMonth = month - 1
      const startPeriod = `${year}-${String(startMonth).padStart(2, '0')}`
      const endPeriod = `${year}-${String(month).padStart(2, '0')}`

      // Due date: last day of the month after the bimonthly period
      const sstDueMonth = month === 12 ? 1 : month + 1
      const sstDueYear = month === 12 ? year + 1 : year
      const lastDay = new Date(sstDueYear, sstDueMonth, 0).getDate()
      const sstDueDate = `${sstDueYear}-${String(sstDueMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      obligations.push({
        type: 'SST_RETURN',
        title: `SST Return — ${startPeriod} to ${endPeriod}`,
        dueDate: sstDueDate,
        period: endPeriod,
      })
    }

    const created: { id: string; type: string; title: string }[] = []
    for (const ob of obligations) {
      // Avoid duplicates: check if obligation for same type+period already exists
      const existing = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM "${tenantSchema}".compliance_obligations
         WHERE type = $1 AND period = $2`,
        ob.type,
        ob.period,
      )
      if (existing.length > 0) continue

      const result = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "${tenantSchema}".compliance_obligations
           (type, title, due_date, period, status)
         VALUES ($1, $2, $3::date, $4, 'UPCOMING')
         RETURNING id`,
        ob.type,
        ob.title,
        ob.dueDate,
        ob.period,
      )
      if (result.length > 0) {
        created.push({ id: result[0].id, type: ob.type, title: ob.title })
      }
    }

    return { created: created.length, obligations: created }
  }

  /**
   * Auto-generate annual compliance obligations.
   *
   * Annual obligations:
   * - Annual Return (AR): incorporation anniversary + 30 days
   * - Financial Statements Circulation: FYE + 6 months
   * - Financial Statements Lodgement: circulation deadline + 30 days
   * - Form E + CP8D: 31 March of the following year
   * - EA Form: end of February of the following year
   */
  async generateAnnualObligations(
    tenantSchema: string,
    year: number,
    incorporationDate: string,
    fyeMonth: number,
  ) {
    const yearStr = String(year)

    // Compute incorporation anniversary for the given year
    const incDate = new Date(incorporationDate)
    const incDay = incDate.getUTCDate()
    const incMonth = incDate.getUTCMonth() // 0-based
    const anniversaryDate = new Date(year, incMonth, incDay)
    const arDueDate = new Date(anniversaryDate)
    arDueDate.setDate(arDueDate.getDate() + 30)

    // Financial year end: last day of fyeMonth in the given year
    const fyeLastDay = new Date(year, fyeMonth, 0).getDate()
    const fyeDate = new Date(year, fyeMonth - 1, fyeLastDay)

    // FS Circulation: FYE + 6 months
    const circulationDate = new Date(fyeDate)
    circulationDate.setMonth(circulationDate.getMonth() + 6)

    // FS Lodgement: circulation + 30 days
    const lodgementDate = new Date(circulationDate)
    lodgementDate.setDate(lodgementDate.getDate() + 30)

    // Form E + CP8D: 31 March of the following year
    const formEDate = new Date(year + 1, 2, 31) // March 31 of next year

    // EA Form: end of February of the following year
    const eaFormLastDay = new Date(year + 1, 2, 0).getDate() // last day of Feb next year
    const eaFormDate = new Date(year + 1, 1, eaFormLastDay)

    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const obligations: CreateObligationDto[] = [
      {
        type: 'AR_FILING',
        title: `Annual Return (AR) Filing — ${yearStr}`,
        dueDate: formatDate(arDueDate),
        period: yearStr,
      },
      {
        type: 'FS_CIRCULATION',
        title: `Financial Statements Circulation — FYE ${yearStr}`,
        dueDate: formatDate(circulationDate),
        period: yearStr,
      },
      {
        type: 'FS_LODGEMENT',
        title: `Financial Statements Lodgement — FYE ${yearStr}`,
        dueDate: formatDate(lodgementDate),
        period: yearStr,
      },
      {
        type: 'FORM_E',
        title: `Form E + CP8D Submission — YA ${yearStr}`,
        dueDate: formatDate(formEDate),
        period: yearStr,
      },
      {
        type: 'EA_FORM',
        title: `EA Form Distribution — YA ${yearStr}`,
        dueDate: formatDate(eaFormDate),
        period: yearStr,
      },
    ]

    const created: { id: string; type: string; title: string }[] = []
    for (const ob of obligations) {
      // Avoid duplicates
      const existing = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM "${tenantSchema}".compliance_obligations
         WHERE type = $1 AND period = $2`,
        ob.type,
        ob.period,
      )
      if (existing.length > 0) continue

      const result = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "${tenantSchema}".compliance_obligations
           (type, title, due_date, period, status)
         VALUES ($1, $2, $3::date, $4, 'UPCOMING')
         RETURNING id`,
        ob.type,
        ob.title,
        ob.dueDate,
        ob.period,
      )
      if (result.length > 0) {
        created.push({ id: result[0].id, type: ob.type, title: ob.title })
      }
    }

    return { created: created.length, obligations: created }
  }

  /**
   * Get compliance dashboard summary:
   * - Overdue count (past due_date, not completed)
   * - Due soon count (within next 14 days, not completed)
   * - Upcoming count (within next 30 days, not completed)
   * - Completed this month
   * - List of next 10 upcoming obligations
   */
  async getDashboard(tenantSchema: string) {
    const today = new Date().toISOString().split('T')[0]

    // Overdue: due_date < today AND status != 'COMPLETED'
    const overdueResult = await this.prisma.$queryRawUnsafe<{ count: string }[]>(
      `SELECT COUNT(*) AS count
       FROM "${tenantSchema}".compliance_obligations
       WHERE due_date < $1::date AND status != 'COMPLETED'`,
      today,
    )
    const overdue = Number(overdueResult[0]?.count ?? 0)

    // Due soon: due_date between today and today + 14 days, not completed
    const dueSoonResult = await this.prisma.$queryRawUnsafe<{ count: string }[]>(
      `SELECT COUNT(*) AS count
       FROM "${tenantSchema}".compliance_obligations
       WHERE due_date >= $1::date
         AND due_date <= ($1::date + INTERVAL '14 days')
         AND status != 'COMPLETED'`,
      today,
    )
    const dueSoon = Number(dueSoonResult[0]?.count ?? 0)

    // Upcoming: due_date between today and today + 30 days, not completed
    const upcomingResult = await this.prisma.$queryRawUnsafe<{ count: string }[]>(
      `SELECT COUNT(*) AS count
       FROM "${tenantSchema}".compliance_obligations
       WHERE due_date >= $1::date
         AND due_date <= ($1::date + INTERVAL '30 days')
         AND status != 'COMPLETED'`,
      today,
    )
    const upcoming = Number(upcomingResult[0]?.count ?? 0)

    // Completed this month
    const startOfMonth = `${today.substring(0, 7)}-01`
    const completedResult = await this.prisma.$queryRawUnsafe<{ count: string }[]>(
      `SELECT COUNT(*) AS count
       FROM "${tenantSchema}".compliance_obligations
       WHERE status = 'COMPLETED'
         AND completed_at >= $1::date
         AND completed_at < ($1::date + INTERVAL '1 month')`,
      startOfMonth,
    )
    const completedThisMonth = Number(completedResult[0]?.count ?? 0)

    // Next 10 upcoming obligations (not completed, due_date >= today)
    const nextObligations = await this.prisma.$queryRawUnsafe<ObligationRow[]>(
      `SELECT id, type, title, due_date, period, status, completed_at, completed_by,
              notes, created_at, updated_at
       FROM "${tenantSchema}".compliance_obligations
       WHERE status != 'COMPLETED' AND due_date >= $1::date
       ORDER BY due_date ASC
       LIMIT 10`,
      today,
    )

    return {
      overdue,
      dueSoon,
      upcoming,
      completedThisMonth,
      nextObligations,
    }
  }
}
