import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface TrialBalanceAccount {
  code: string
  name: string
  type: string
  debitTotal: string
  creditTotal: string
  balance: string
}

export interface TrialBalanceResult {
  asOfDate: string
  accounts: TrialBalanceAccount[]
  totalDebits: string
  totalCredits: string
}

export interface ProfitLossLineItem {
  code: string
  name: string
  amount: string
}

export interface ProfitLossResult {
  startDate: string
  endDate: string
  revenue: ProfitLossLineItem[]
  expenses: ProfitLossLineItem[]
  totalRevenue: string
  totalExpenses: string
  netProfit: string
}

export interface BalanceSheetLineItem {
  code: string
  name: string
  amount: string
}

export interface BalanceSheetResult {
  asOfDate: string
  assets: BalanceSheetLineItem[]
  liabilities: BalanceSheetLineItem[]
  equity: BalanceSheetLineItem[]
  totalAssets: string
  totalLiabilities: string
  totalEquity: string
  totalLiabilitiesAndEquity: string
}

export interface CashFlowResult {
  startDate: string
  endDate: string
  operating: {
    inflows: string
    outflows: string
    net: string
  }
  total: string
}

export interface AgingBucket {
  current: string
  days1to30: string
  days31to60: string
  days61to90: string
  days90plus: string
  total: string
}

export interface AgingLineItem extends AgingBucket {
  contactId: string
  contactName: string
}

export interface AgingResult {
  asOfDate: string
  items: AgingLineItem[]
  totals: AgingBucket
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────
  // 1. TRIAL BALANCE
  // ─────────────────────────────────────────────

  async getTrialBalance(tenantSchema: string, asOfDate: string): Promise<TrialBalanceResult> {
    // Hybrid approach: combine invoice/bill/payment data with manual journal entries
    // All amounts are in sen (BIGINT). We use COALESCE to handle NULLs.
    //
    // Sources:
    //   - Invoices (non-cancelled, up to asOfDate): credit to revenue accounts (via invoice_lines.account_id)
    //   - Bills (non-cancelled, up to asOfDate): debit to expense accounts (via bill_lines.account_id)
    //   - Payments RECEIVED (up to asOfDate): debit to cash/bank account (default ASSET)
    //   - Payments MADE (up to asOfDate): credit to cash/bank account (default ASSET)
    //   - Manual journal entries (POSTED, up to asOfDate): debit_sen / credit_sen per line
    //
    // We union all these into a single result set grouped by account.

    const rows = await this.prisma.$queryRawUnsafe<TrialBalanceAccount[]>(`
      WITH combined AS (
        -- Invoice lines: credit to revenue/income accounts
        SELECT
          COALESCE(il.account_id, a_default.id) AS account_id,
          0::BIGINT AS debit_sen,
          il.total_sen AS credit_sen
        FROM "${tenantSchema}".invoices i
        JOIN "${tenantSchema}".invoice_lines il ON il.invoice_id = i.id
        LEFT JOIN "${tenantSchema}".accounts a_default
          ON a_default.type = 'REVENUE' AND a_default.is_system = TRUE AND a_default.deleted_at IS NULL
        WHERE i.status != 'CANCELLED'
          AND i.deleted_at IS NULL
          AND i.issue_date <= $1::date

        UNION ALL

        -- Bill lines: debit to expense accounts
        SELECT
          COALESCE(bl.account_id, a_default.id) AS account_id,
          bl.total_sen AS debit_sen,
          0::BIGINT AS credit_sen
        FROM "${tenantSchema}".bills b
        JOIN "${tenantSchema}".bill_lines bl ON bl.bill_id = b.id
        LEFT JOIN "${tenantSchema}".accounts a_default
          ON a_default.type = 'EXPENSE' AND a_default.is_system = TRUE AND a_default.deleted_at IS NULL
        WHERE b.status != 'CANCELLED'
          AND b.deleted_at IS NULL
          AND b.bill_date <= $1::date

        UNION ALL

        -- Payments received: debit to cash/bank (asset)
        SELECT
          (SELECT id FROM "${tenantSchema}".accounts
           WHERE code = '1010' AND deleted_at IS NULL LIMIT 1) AS account_id,
          p.amount_sen AS debit_sen,
          0::BIGINT AS credit_sen
        FROM "${tenantSchema}".payments p
        WHERE p.type = 'RECEIVED'
          AND p.deleted_at IS NULL
          AND p.date <= $1::date

        UNION ALL

        -- Payments made: credit from cash/bank (asset)
        SELECT
          (SELECT id FROM "${tenantSchema}".accounts
           WHERE code = '1010' AND deleted_at IS NULL LIMIT 1) AS account_id,
          0::BIGINT AS debit_sen,
          p.amount_sen AS credit_sen
        FROM "${tenantSchema}".payments p
        WHERE p.type = 'MADE'
          AND p.deleted_at IS NULL
          AND p.date <= $1::date

        UNION ALL

        -- Manual journal lines (POSTED only)
        SELECT
          jl.account_id,
          jl.debit_sen,
          jl.credit_sen
        FROM "${tenantSchema}".journal_entries je
        JOIN "${tenantSchema}".journal_lines jl ON jl.journal_entry_id = je.id
        WHERE je.status = 'POSTED'
          AND je.deleted_at IS NULL
          AND je.date <= $1::date
      )
      SELECT
        a.code,
        a.name,
        a.type,
        COALESCE(SUM(c.debit_sen), 0)::TEXT AS "debitTotal",
        COALESCE(SUM(c.credit_sen), 0)::TEXT AS "creditTotal",
        (COALESCE(SUM(c.debit_sen), 0) - COALESCE(SUM(c.credit_sen), 0))::TEXT AS balance
      FROM combined c
      JOIN "${tenantSchema}".accounts a ON a.id = c.account_id
      WHERE a.deleted_at IS NULL
      GROUP BY a.code, a.name, a.type
      HAVING SUM(c.debit_sen) != 0 OR SUM(c.credit_sen) != 0
      ORDER BY a.code
    `, asOfDate)

    let totalDebits = BigInt(0)
    let totalCredits = BigInt(0)
    for (const row of rows) {
      totalDebits += BigInt(row.debitTotal)
      totalCredits += BigInt(row.creditTotal)
    }

    return {
      asOfDate,
      accounts: rows,
      totalDebits: totalDebits.toString(),
      totalCredits: totalCredits.toString(),
    }
  }

  // ─────────────────────────────────────────────
  // 2. PROFIT & LOSS
  // ─────────────────────────────────────────────

  async getProfitAndLoss(
    tenantSchema: string,
    startDate: string,
    endDate: string,
  ): Promise<ProfitLossResult> {
    // Revenue: invoice totals grouped by account (from invoice_lines)
    const revenue = await this.prisma.$queryRawUnsafe<ProfitLossLineItem[]>(`
      SELECT
        COALESCE(a.code, '4000') AS code,
        COALESCE(a.name, 'Sales Revenue') AS name,
        SUM(il.total_sen)::TEXT AS amount
      FROM "${tenantSchema}".invoices i
      JOIN "${tenantSchema}".invoice_lines il ON il.invoice_id = i.id
      LEFT JOIN "${tenantSchema}".accounts a ON a.id = il.account_id
      WHERE i.status != 'CANCELLED'
        AND i.deleted_at IS NULL
        AND i.issue_date >= $1::date
        AND i.issue_date <= $2::date
      GROUP BY COALESCE(a.code, '4000'), COALESCE(a.name, 'Sales Revenue')
      ORDER BY code
    `, startDate, endDate)

    // Revenue from manual journal entries credited to REVENUE accounts
    const revenueJournals = await this.prisma.$queryRawUnsafe<ProfitLossLineItem[]>(`
      SELECT
        a.code,
        a.name,
        (SUM(jl.credit_sen) - SUM(jl.debit_sen))::TEXT AS amount
      FROM "${tenantSchema}".journal_entries je
      JOIN "${tenantSchema}".journal_lines jl ON jl.journal_entry_id = je.id
      JOIN "${tenantSchema}".accounts a ON a.id = jl.account_id
      WHERE je.status = 'POSTED'
        AND je.source_type = 'MANUAL'
        AND je.deleted_at IS NULL
        AND je.date >= $1::date
        AND je.date <= $2::date
        AND a.type = 'REVENUE'
        AND a.deleted_at IS NULL
      GROUP BY a.code, a.name
      HAVING (SUM(jl.credit_sen) - SUM(jl.debit_sen)) > 0
      ORDER BY a.code
    `, startDate, endDate)

    // Expenses: bill totals grouped by account (from bill_lines)
    const billExpenses = await this.prisma.$queryRawUnsafe<ProfitLossLineItem[]>(`
      SELECT
        COALESCE(a.code, '5000') AS code,
        COALESCE(a.name, 'Cost of Goods Sold') AS name,
        SUM(bl.total_sen)::TEXT AS amount
      FROM "${tenantSchema}".bills b
      JOIN "${tenantSchema}".bill_lines bl ON bl.bill_id = b.id
      LEFT JOIN "${tenantSchema}".accounts a ON a.id = bl.account_id
      WHERE b.status != 'CANCELLED'
        AND b.deleted_at IS NULL
        AND b.bill_date >= $1::date
        AND b.bill_date <= $2::date
      GROUP BY COALESCE(a.code, '5000'), COALESCE(a.name, 'Cost of Goods Sold')
      ORDER BY code
    `, startDate, endDate)

    // Expenses: payroll costs within the date range
    const payrollExpenses = await this.prisma.$queryRawUnsafe<ProfitLossLineItem[]>(`
      SELECT
        '6010' AS code,
        'Salaries & Wages' AS name,
        SUM(pi.gross_salary_sen)::TEXT AS amount
      FROM "${tenantSchema}".payroll_runs pr
      JOIN "${tenantSchema}".payroll_items pi ON pi.payroll_run_id = pr.id
      WHERE pr.status IN ('APPROVED', 'PAID')
        AND MAKE_DATE(pr.period_year, pr.period_month, 1) >= $1::date
        AND MAKE_DATE(pr.period_year, pr.period_month, 1) <= $2::date
      HAVING SUM(pi.gross_salary_sen) > 0
    `, startDate, endDate)

    // Employer statutory contributions as separate expense line
    const employerContributions = await this.prisma.$queryRawUnsafe<ProfitLossLineItem[]>(`
      SELECT
        '6020' AS code,
        'Employer Statutory Contributions' AS name,
        (SUM(pi.epf_employer_sen) + SUM(pi.socso_employer_sen) + SUM(pi.eis_employer_sen))::TEXT AS amount
      FROM "${tenantSchema}".payroll_runs pr
      JOIN "${tenantSchema}".payroll_items pi ON pi.payroll_run_id = pr.id
      WHERE pr.status IN ('APPROVED', 'PAID')
        AND MAKE_DATE(pr.period_year, pr.period_month, 1) >= $1::date
        AND MAKE_DATE(pr.period_year, pr.period_month, 1) <= $2::date
      HAVING (SUM(pi.epf_employer_sen) + SUM(pi.socso_employer_sen) + SUM(pi.eis_employer_sen)) > 0
    `, startDate, endDate)

    // Expenses from manual journal entries debited to EXPENSE accounts
    const expenseJournals = await this.prisma.$queryRawUnsafe<ProfitLossLineItem[]>(`
      SELECT
        a.code,
        a.name,
        (SUM(jl.debit_sen) - SUM(jl.credit_sen))::TEXT AS amount
      FROM "${tenantSchema}".journal_entries je
      JOIN "${tenantSchema}".journal_lines jl ON jl.journal_entry_id = je.id
      JOIN "${tenantSchema}".accounts a ON a.id = jl.account_id
      WHERE je.status = 'POSTED'
        AND je.source_type = 'MANUAL'
        AND je.deleted_at IS NULL
        AND je.date >= $1::date
        AND je.date <= $2::date
        AND a.type = 'EXPENSE'
        AND a.deleted_at IS NULL
      GROUP BY a.code, a.name
      HAVING (SUM(jl.debit_sen) - SUM(jl.credit_sen)) > 0
      ORDER BY a.code
    `, startDate, endDate)

    // Merge revenue items (invoice revenue + journal revenue), combining by code
    const allRevenue = mergeLineItems([...revenue, ...revenueJournals])
    const allExpenses = mergeLineItems([
      ...billExpenses,
      ...payrollExpenses,
      ...employerContributions,
      ...expenseJournals,
    ])

    const totalRevenue = allRevenue.reduce((sum, r) => sum + BigInt(r.amount), BigInt(0))
    const totalExpenses = allExpenses.reduce((sum, e) => sum + BigInt(e.amount), BigInt(0))
    const netProfit = totalRevenue - totalExpenses

    return {
      startDate,
      endDate,
      revenue: allRevenue,
      expenses: allExpenses,
      totalRevenue: totalRevenue.toString(),
      totalExpenses: totalExpenses.toString(),
      netProfit: netProfit.toString(),
    }
  }

  // ─────────────────────────────────────────────
  // 3. BALANCE SHEET
  // ─────────────────────────────────────────────

  async getBalanceSheet(tenantSchema: string, asOfDate: string): Promise<BalanceSheetResult> {
    // ASSETS
    // Cash & Bank: payments received minus payments made (up to asOfDate)
    const cashRows = await this.prisma.$queryRawUnsafe<{ net_cash: string }[]>(`
      SELECT (
        COALESCE((
          SELECT SUM(amount_sen) FROM "${tenantSchema}".payments
          WHERE type = 'RECEIVED' AND deleted_at IS NULL AND date <= $1::date
        ), 0) -
        COALESCE((
          SELECT SUM(amount_sen) FROM "${tenantSchema}".payments
          WHERE type = 'MADE' AND deleted_at IS NULL AND date <= $1::date
        ), 0)
      )::TEXT AS net_cash
    `, asOfDate)
    const netCash = BigInt(cashRows[0]?.net_cash ?? '0')

    // Accounts Receivable: outstanding invoice balances
    const arRows = await this.prisma.$queryRawUnsafe<{ total_ar: string }[]>(`
      SELECT COALESCE(SUM(balance_sen), 0)::TEXT AS total_ar
      FROM "${tenantSchema}".invoices
      WHERE status NOT IN ('CANCELLED', 'DRAFT')
        AND deleted_at IS NULL
        AND issue_date <= $1::date
    `, asOfDate)
    const totalAR = BigInt(arRows[0]?.total_ar ?? '0')

    // Inventory value: sum of (quantity * average_cost_sen) from stock_levels
    const inventoryRows = await this.prisma.$queryRawUnsafe<{ total_inventory: string }[]>(`
      SELECT COALESCE(SUM(sl.quantity * sl.average_cost_sen), 0)::TEXT AS total_inventory
      FROM "${tenantSchema}".stock_levels sl
      JOIN "${tenantSchema}".products p ON p.id = sl.product_id
      WHERE p.track_inventory = TRUE
        AND p.deleted_at IS NULL
    `)
    const totalInventory = BigInt(inventoryRows[0]?.total_inventory ?? '0')

    // Additional assets from manual journal entries
    const assetJournalRows = await this.prisma.$queryRawUnsafe<BalanceSheetLineItem[]>(`
      SELECT
        a.code,
        a.name,
        (SUM(jl.debit_sen) - SUM(jl.credit_sen))::TEXT AS amount
      FROM "${tenantSchema}".journal_entries je
      JOIN "${tenantSchema}".journal_lines jl ON jl.journal_entry_id = je.id
      JOIN "${tenantSchema}".accounts a ON a.id = jl.account_id
      WHERE je.status = 'POSTED'
        AND je.source_type = 'MANUAL'
        AND je.deleted_at IS NULL
        AND je.date <= $1::date
        AND a.type = 'ASSET'
        AND a.deleted_at IS NULL
      GROUP BY a.code, a.name
      HAVING (SUM(jl.debit_sen) - SUM(jl.credit_sen)) != 0
      ORDER BY a.code
    `, asOfDate)

    const assets: BalanceSheetLineItem[] = []
    if (netCash !== BigInt(0)) {
      assets.push({ code: '1010', name: 'Cash & Bank', amount: netCash.toString() })
    }
    if (totalAR !== BigInt(0)) {
      assets.push({ code: '1200', name: 'Accounts Receivable', amount: totalAR.toString() })
    }
    if (totalInventory !== BigInt(0)) {
      assets.push({ code: '1300', name: 'Inventory', amount: totalInventory.toString() })
    }
    // Add manual journal asset entries (skip codes we already have)
    const existingCodes = new Set(assets.map((a) => a.code))
    for (const row of assetJournalRows) {
      if (!existingCodes.has(row.code)) {
        assets.push(row)
      }
    }

    // LIABILITIES
    // Accounts Payable: outstanding bill balances
    const apRows = await this.prisma.$queryRawUnsafe<{ total_ap: string }[]>(`
      SELECT COALESCE(SUM(balance_sen), 0)::TEXT AS total_ap
      FROM "${tenantSchema}".bills
      WHERE status NOT IN ('CANCELLED', 'DRAFT')
        AND deleted_at IS NULL
        AND bill_date <= $1::date
    `, asOfDate)
    const totalAP = BigInt(apRows[0]?.total_ap ?? '0')

    // SST Payable: total SST collected on invoices minus SST paid on bills
    const sstRows = await this.prisma.$queryRawUnsafe<{ sst_payable: string }[]>(`
      SELECT (
        COALESCE((
          SELECT SUM(sst_amount_sen) FROM "${tenantSchema}".invoices
          WHERE status != 'CANCELLED' AND deleted_at IS NULL AND issue_date <= $1::date
        ), 0) -
        COALESCE((
          SELECT SUM(sst_amount_sen) FROM "${tenantSchema}".bills
          WHERE status != 'CANCELLED' AND deleted_at IS NULL AND bill_date <= $1::date
        ), 0)
      )::TEXT AS sst_payable
    `, asOfDate)
    const sstPayable = BigInt(sstRows[0]?.sst_payable ?? '0')

    // Statutory payables: unpaid EPF/SOCSO/EIS/PCB from payroll
    const statutoryRows = await this.prisma.$queryRawUnsafe<{ statutory_payable: string }[]>(`
      SELECT COALESCE(SUM(
        pi.epf_employee_sen + pi.epf_employer_sen +
        pi.socso_employee_sen + pi.socso_employer_sen +
        pi.eis_employee_sen + pi.eis_employer_sen +
        pi.pcb_sen
      ), 0)::TEXT AS statutory_payable
      FROM "${tenantSchema}".payroll_runs pr
      JOIN "${tenantSchema}".payroll_items pi ON pi.payroll_run_id = pr.id
      WHERE pr.status IN ('APPROVED', 'PAID')
        AND MAKE_DATE(pr.period_year, pr.period_month, 1) <= $1::date
    `, asOfDate)
    const statutoryPayable = BigInt(statutoryRows[0]?.statutory_payable ?? '0')

    // Liabilities from manual journal entries
    const liabilityJournalRows = await this.prisma.$queryRawUnsafe<BalanceSheetLineItem[]>(`
      SELECT
        a.code,
        a.name,
        (SUM(jl.credit_sen) - SUM(jl.debit_sen))::TEXT AS amount
      FROM "${tenantSchema}".journal_entries je
      JOIN "${tenantSchema}".journal_lines jl ON jl.journal_entry_id = je.id
      JOIN "${tenantSchema}".accounts a ON a.id = jl.account_id
      WHERE je.status = 'POSTED'
        AND je.source_type = 'MANUAL'
        AND je.deleted_at IS NULL
        AND je.date <= $1::date
        AND a.type = 'LIABILITY'
        AND a.deleted_at IS NULL
      GROUP BY a.code, a.name
      HAVING (SUM(jl.credit_sen) - SUM(jl.debit_sen)) != 0
      ORDER BY a.code
    `, asOfDate)

    const liabilities: BalanceSheetLineItem[] = []
    if (totalAP !== BigInt(0)) {
      liabilities.push({ code: '2100', name: 'Accounts Payable', amount: totalAP.toString() })
    }
    if (sstPayable > BigInt(0)) {
      liabilities.push({ code: '2200', name: 'SST Payable', amount: sstPayable.toString() })
    }
    if (statutoryPayable > BigInt(0)) {
      liabilities.push({
        code: '2300',
        name: 'Statutory Payables (EPF/SOCSO/EIS/PCB)',
        amount: statutoryPayable.toString(),
      })
    }
    const existingLiabCodes = new Set(liabilities.map((l) => l.code))
    for (const row of liabilityJournalRows) {
      if (!existingLiabCodes.has(row.code)) {
        liabilities.push(row)
      }
    }

    // EQUITY
    // Opening equity from manual journal entries on EQUITY accounts
    const equityJournalRows = await this.prisma.$queryRawUnsafe<BalanceSheetLineItem[]>(`
      SELECT
        a.code,
        a.name,
        (SUM(jl.credit_sen) - SUM(jl.debit_sen))::TEXT AS amount
      FROM "${tenantSchema}".journal_entries je
      JOIN "${tenantSchema}".journal_lines jl ON jl.journal_entry_id = je.id
      JOIN "${tenantSchema}".accounts a ON a.id = jl.account_id
      WHERE je.status = 'POSTED'
        AND je.source_type = 'MANUAL'
        AND je.deleted_at IS NULL
        AND je.date <= $1::date
        AND a.type = 'EQUITY'
        AND a.deleted_at IS NULL
      GROUP BY a.code, a.name
      HAVING (SUM(jl.credit_sen) - SUM(jl.debit_sen)) != 0
      ORDER BY a.code
    `, asOfDate)

    // Retained Earnings = cumulative net profit (all revenue - all expenses up to asOfDate)
    const retainedRows = await this.prisma.$queryRawUnsafe<{ retained: string }[]>(`
      SELECT (
        COALESCE((
          SELECT SUM(total_sen) FROM "${tenantSchema}".invoices
          WHERE status != 'CANCELLED' AND deleted_at IS NULL AND issue_date <= $1::date
        ), 0) -
        COALESCE((
          SELECT SUM(total_sen) FROM "${tenantSchema}".bills
          WHERE status != 'CANCELLED' AND deleted_at IS NULL AND bill_date <= $1::date
        ), 0) -
        COALESCE((
          SELECT SUM(pi.gross_salary_sen)
          FROM "${tenantSchema}".payroll_runs pr
          JOIN "${tenantSchema}".payroll_items pi ON pi.payroll_run_id = pr.id
          WHERE pr.status IN ('APPROVED', 'PAID')
            AND MAKE_DATE(pr.period_year, pr.period_month, 1) <= $1::date
        ), 0) -
        COALESCE((
          SELECT SUM(pi.epf_employer_sen + pi.socso_employer_sen + pi.eis_employer_sen)
          FROM "${tenantSchema}".payroll_runs pr
          JOIN "${tenantSchema}".payroll_items pi ON pi.payroll_run_id = pr.id
          WHERE pr.status IN ('APPROVED', 'PAID')
            AND MAKE_DATE(pr.period_year, pr.period_month, 1) <= $1::date
        ), 0)
      )::TEXT AS retained
    `, asOfDate)
    const retainedEarnings = BigInt(retainedRows[0]?.retained ?? '0')

    const equity: BalanceSheetLineItem[] = [...equityJournalRows]
    if (retainedEarnings !== BigInt(0)) {
      equity.push({
        code: '3200',
        name: 'Retained Earnings',
        amount: retainedEarnings.toString(),
      })
    }

    const totalAssets = assets.reduce((sum, a) => sum + BigInt(a.amount), BigInt(0))
    const totalLiabilities = liabilities.reduce((sum, l) => sum + BigInt(l.amount), BigInt(0))
    const totalEquity = equity.reduce((sum, e) => sum + BigInt(e.amount), BigInt(0))
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity

    return {
      asOfDate,
      assets,
      liabilities,
      equity,
      totalAssets: totalAssets.toString(),
      totalLiabilities: totalLiabilities.toString(),
      totalEquity: totalEquity.toString(),
      totalLiabilitiesAndEquity: totalLiabilitiesAndEquity.toString(),
    }
  }

  // ─────────────────────────────────────────────
  // 4. CASH FLOW (simplified)
  // ─────────────────────────────────────────────

  async getCashFlow(
    tenantSchema: string,
    startDate: string,
    endDate: string,
  ): Promise<CashFlowResult> {
    const rows = await this.prisma.$queryRawUnsafe<{
      inflows: string
      outflows: string
    }[]>(`
      SELECT
        COALESCE((
          SELECT SUM(amount_sen)
          FROM "${tenantSchema}".payments
          WHERE type = 'RECEIVED'
            AND deleted_at IS NULL
            AND date >= $1::date
            AND date <= $2::date
        ), 0)::TEXT AS inflows,
        COALESCE((
          SELECT SUM(amount_sen)
          FROM "${tenantSchema}".payments
          WHERE type = 'MADE'
            AND deleted_at IS NULL
            AND date >= $1::date
            AND date <= $2::date
        ), 0)::TEXT AS outflows
    `, startDate, endDate)

    const inflows = BigInt(rows[0]?.inflows ?? '0')
    const outflows = BigInt(rows[0]?.outflows ?? '0')
    const net = inflows - outflows

    return {
      startDate,
      endDate,
      operating: {
        inflows: inflows.toString(),
        outflows: outflows.toString(),
        net: net.toString(),
      },
      total: net.toString(),
    }
  }

  // ─────────────────────────────────────────────
  // 5. ACCOUNTS PAYABLE AGING
  // ─────────────────────────────────────────────

  async getAPAging(tenantSchema: string): Promise<AgingResult> {
    const today = new Date().toISOString().split('T')[0]

    const rows = await this.prisma.$queryRawUnsafe<AgingLineItem[]>(`
      SELECT
        c.id AS "contactId",
        c.name AS "contactName",
        COALESCE(SUM(CASE
          WHEN b.due_date >= CURRENT_DATE THEN b.balance_sen ELSE 0
        END), 0)::TEXT AS current,
        COALESCE(SUM(CASE
          WHEN b.due_date < CURRENT_DATE
           AND b.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN b.balance_sen ELSE 0
        END), 0)::TEXT AS "days1to30",
        COALESCE(SUM(CASE
          WHEN b.due_date < CURRENT_DATE - INTERVAL '30 days'
           AND b.due_date >= CURRENT_DATE - INTERVAL '60 days' THEN b.balance_sen ELSE 0
        END), 0)::TEXT AS "days31to60",
        COALESCE(SUM(CASE
          WHEN b.due_date < CURRENT_DATE - INTERVAL '60 days'
           AND b.due_date >= CURRENT_DATE - INTERVAL '90 days' THEN b.balance_sen ELSE 0
        END), 0)::TEXT AS "days61to90",
        COALESCE(SUM(CASE
          WHEN b.due_date < CURRENT_DATE - INTERVAL '90 days' THEN b.balance_sen ELSE 0
        END), 0)::TEXT AS "days90plus",
        COALESCE(SUM(b.balance_sen), 0)::TEXT AS total
      FROM "${tenantSchema}".bills b
      JOIN "${tenantSchema}".contacts c ON c.id = b.contact_id
      WHERE b.status NOT IN ('CANCELLED', 'DRAFT', 'PAID')
        AND b.deleted_at IS NULL
        AND b.balance_sen > 0
      GROUP BY c.id, c.name
      ORDER BY c.name
    `)

    const totals = aggregateAgingBuckets(rows)

    return {
      asOfDate: today,
      items: rows,
      totals,
    }
  }

  // ─────────────────────────────────────────────
  // 6. ACCOUNTS RECEIVABLE AGING
  // ─────────────────────────────────────────────

  async getARAging(tenantSchema: string): Promise<AgingResult> {
    const today = new Date().toISOString().split('T')[0]

    const rows = await this.prisma.$queryRawUnsafe<AgingLineItem[]>(`
      SELECT
        c.id AS "contactId",
        c.name AS "contactName",
        COALESCE(SUM(CASE
          WHEN i.due_date >= CURRENT_DATE THEN i.balance_sen ELSE 0
        END), 0)::TEXT AS current,
        COALESCE(SUM(CASE
          WHEN i.due_date < CURRENT_DATE
           AND i.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN i.balance_sen ELSE 0
        END), 0)::TEXT AS "days1to30",
        COALESCE(SUM(CASE
          WHEN i.due_date < CURRENT_DATE - INTERVAL '30 days'
           AND i.due_date >= CURRENT_DATE - INTERVAL '60 days' THEN i.balance_sen ELSE 0
        END), 0)::TEXT AS "days31to60",
        COALESCE(SUM(CASE
          WHEN i.due_date < CURRENT_DATE - INTERVAL '60 days'
           AND i.due_date >= CURRENT_DATE - INTERVAL '90 days' THEN i.balance_sen ELSE 0
        END), 0)::TEXT AS "days61to90",
        COALESCE(SUM(CASE
          WHEN i.due_date < CURRENT_DATE - INTERVAL '90 days' THEN i.balance_sen ELSE 0
        END), 0)::TEXT AS "days90plus",
        COALESCE(SUM(i.balance_sen), 0)::TEXT AS total
      FROM "${tenantSchema}".invoices i
      JOIN "${tenantSchema}".contacts c ON c.id = i.contact_id
      WHERE i.status NOT IN ('CANCELLED', 'DRAFT', 'PAID')
        AND i.deleted_at IS NULL
        AND i.balance_sen > 0
      GROUP BY c.id, c.name
      ORDER BY c.name
    `)

    const totals = aggregateAgingBuckets(rows)

    return {
      asOfDate: today,
      items: rows,
      totals,
    }
  }
}

// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────

/** Merge line items with the same code, summing their amounts */
function mergeLineItems(items: ProfitLossLineItem[]): ProfitLossLineItem[] {
  const map = new Map<string, { code: string; name: string; amount: bigint }>()
  for (const item of items) {
    const existing = map.get(item.code)
    if (existing) {
      existing.amount += BigInt(item.amount)
    } else {
      map.set(item.code, { code: item.code, name: item.name, amount: BigInt(item.amount) })
    }
  }
  return Array.from(map.values())
    .filter((item) => item.amount > BigInt(0))
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((item) => ({ code: item.code, name: item.name, amount: item.amount.toString() }))
}

/** Aggregate aging buckets from individual line items into totals */
function aggregateAgingBuckets(items: AgingLineItem[]): AgingBucket {
  let current = BigInt(0)
  let days1to30 = BigInt(0)
  let days31to60 = BigInt(0)
  let days61to90 = BigInt(0)
  let days90plus = BigInt(0)
  let total = BigInt(0)

  for (const item of items) {
    current += BigInt(item.current)
    days1to30 += BigInt(item.days1to30)
    days31to60 += BigInt(item.days31to60)
    days61to90 += BigInt(item.days61to90)
    days90plus += BigInt(item.days90plus)
    total += BigInt(item.total)
  }

  return {
    current: current.toString(),
    days1to30: days1to30.toString(),
    days31to60: days31to60.toString(),
    days61to90: days61to90.toString(),
    days90plus: days90plus.toString(),
    total: total.toString(),
  }
}
