'use client'
import { useState } from 'react'
import {
  useTrialBalance,
  useProfitAndLoss,
  useBalanceSheet,
  useCashFlow,
  useAPAging,
  useARAging,
} from '@/hooks/use-accounting'
import { formatRinggit } from '@/lib/utils'

type Tab = 'trial-balance' | 'pnl' | 'balance-sheet' | 'cash-flow' | 'ar-aging' | 'ap-aging'

const TABS: { key: Tab; label: string }[] = [
  { key: 'trial-balance', label: 'Trial Balance' },
  { key: 'pnl', label: 'Profit & Loss' },
  { key: 'balance-sheet', label: 'Balance Sheet' },
  { key: 'cash-flow', label: 'Cash Flow' },
  { key: 'ar-aging', label: 'AR Aging' },
  { key: 'ap-aging', label: 'AP Aging' },
]

function getDefaultStartDate() {
  const now = new Date()
  return `${now.getFullYear()}-01-01`
}

function getDefaultEndDate() {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${mm}-${dd}`
}

export default function FinancialReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('trial-balance')
  const [asOfDate, setAsOfDate] = useState(getDefaultEndDate)
  const [startDate, setStartDate] = useState(getDefaultStartDate)
  const [endDate, setEndDate] = useState(getDefaultEndDate)

  // Hooks — always called, enabled by query params
  const trialBalance = useTrialBalance(activeTab === 'trial-balance' ? asOfDate : '')
  const profitAndLoss = useProfitAndLoss(
    activeTab === 'pnl' ? startDate : '',
    activeTab === 'pnl' ? endDate : '',
  )
  const balanceSheet = useBalanceSheet(activeTab === 'balance-sheet' ? asOfDate : '')
  const cashFlow = useCashFlow(
    activeTab === 'cash-flow' ? startDate : '',
    activeTab === 'cash-flow' ? endDate : '',
  )
  const arAging = useARAging()
  const apAging = useAPAging()

  const showSingleDate = activeTab === 'trial-balance' || activeTab === 'balance-sheet'
  const showDateRange = activeTab === 'pnl' || activeTab === 'cash-flow'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Financial Reports</h1>
        <p className="text-gray-500 text-sm mt-1">View your financial statements and aging reports</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Controls */}
      {showSingleDate && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">As of Date</label>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      )}
      {showDateRange && (
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-gray-700">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
          <label className="text-sm font-medium text-gray-700">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Report Content */}
      {activeTab === 'trial-balance' && <TrialBalanceReport query={trialBalance} />}
      {activeTab === 'pnl' && <ProfitAndLossReport query={profitAndLoss} />}
      {activeTab === 'balance-sheet' && <BalanceSheetReport query={balanceSheet} />}
      {activeTab === 'cash-flow' && <CashFlowReport query={cashFlow} />}
      {activeTab === 'ar-aging' && <AgingReport query={arAging} title="Accounts Receivable Aging" />}
      {activeTab === 'ap-aging' && <AgingReport query={apAging} title="Accounts Payable Aging" />}
    </div>
  )
}

/* ─── Trial Balance ────────────────────────────────────────────────────────── */

function TrialBalanceReport({ query }: { query: ReturnType<typeof useTrialBalance> }) {
  const { data, isLoading, error } = query

  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorMessage message="Failed to load trial balance" />
  if (!data) return <EmptyState message="No trial balance data available" />

  const rows = data.rows ?? []
  const totalDebit = data.totalDebitSen ?? 0
  const totalCredit = data.totalCreditSen ?? 0
  const isBalanced = totalDebit === totalCredit

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">Trial Balance</h2>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isBalanced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {isBalanced ? 'Balanced' : 'UNBALANCED'}
        </span>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Account Code</th>
            <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Account Name</th>
            <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Debit (RM)</th>
            <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Credit (RM)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center py-16 text-gray-400 text-sm">No entries found</td>
            </tr>
          ) : (
            rows.map((row: any, i: number) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 text-sm font-mono text-gray-600">{row.code}</td>
                <td className="px-5 py-3 text-sm text-gray-800">{row.name}</td>
                <td className="px-5 py-3 text-sm text-right text-gray-700">
                  {row.debit_sen ? formatRinggit(row.debit_sen) : '—'}
                </td>
                <td className="px-5 py-3 text-sm text-right text-gray-700">
                  {row.credit_sen ? formatRinggit(row.credit_sen) : '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td colSpan={2} className="px-5 py-3 text-sm font-semibold text-gray-900">Total</td>
              <td className="px-5 py-3 text-sm font-semibold text-right text-gray-900">{formatRinggit(totalDebit)}</td>
              <td className="px-5 py-3 text-sm font-semibold text-right text-gray-900">{formatRinggit(totalCredit)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

/* ─── Profit & Loss ────────────────────────────────────────────────────────── */

function ProfitAndLossReport({ query }: { query: ReturnType<typeof useProfitAndLoss> }) {
  const { data, isLoading, error } = query

  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorMessage message="Failed to load profit & loss report" />
  if (!data) return <EmptyState message="No profit & loss data available" />

  const revenue = data.revenue ?? []
  const expenses = data.expenses ?? []
  const totalRevenue = data.totalRevenueSen ?? 0
  const totalExpenses = data.totalExpensesSen ?? 0
  const netProfit = data.netProfitSen ?? 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h2 className="text-sm font-semibold text-gray-800">Profit & Loss Statement</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {/* Revenue Section */}
        <div>
          <div className="px-5 py-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Revenue</p>
          </div>
          {revenue.length === 0 ? (
            <div className="px-5 py-4 text-sm text-gray-400">No revenue accounts</div>
          ) : (
            revenue.map((row: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div>
                  <span className="text-sm text-gray-600 font-mono mr-2">{row.code}</span>
                  <span className="text-sm text-gray-800">{row.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-700">{formatRinggit(row.amount_sen)}</span>
              </div>
            ))
          )}
          <div className="flex items-center justify-between px-5 py-3 bg-green-50 border-t border-green-100">
            <span className="text-sm font-semibold text-green-800">Total Revenue</span>
            <span className="text-sm font-semibold text-green-800">{formatRinggit(totalRevenue)}</span>
          </div>
        </div>

        {/* Expenses Section */}
        <div>
          <div className="px-5 py-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Expenses</p>
          </div>
          {expenses.length === 0 ? (
            <div className="px-5 py-4 text-sm text-gray-400">No expense accounts</div>
          ) : (
            expenses.map((row: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div>
                  <span className="text-sm text-gray-600 font-mono mr-2">{row.code}</span>
                  <span className="text-sm text-gray-800">{row.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-700">{formatRinggit(row.amount_sen)}</span>
              </div>
            ))
          )}
          <div className="flex items-center justify-between px-5 py-3 bg-red-50 border-t border-red-100">
            <span className="text-sm font-semibold text-red-800">Total Expenses</span>
            <span className="text-sm font-semibold text-red-800">{formatRinggit(totalExpenses)}</span>
          </div>
        </div>

        {/* Net Profit/Loss */}
        <div className={`flex items-center justify-between px-5 py-4 ${netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <span className={`text-base font-bold ${netProfit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
            {netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
          </span>
          <span className={`text-base font-bold ${netProfit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
            {formatRinggit(Math.abs(netProfit))}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── Balance Sheet ────────────────────────────────────────────────────────── */

function BalanceSheetReport({ query }: { query: ReturnType<typeof useBalanceSheet> }) {
  const { data, isLoading, error } = query

  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorMessage message="Failed to load balance sheet" />
  if (!data) return <EmptyState message="No balance sheet data available" />

  const assets = data.assets ?? []
  const liabilities = data.liabilities ?? []
  const equity = data.equity ?? []
  const totalAssets = data.totalAssetsSen ?? 0
  const totalLiabilities = data.totalLiabilitiesSen ?? 0
  const totalEquity = data.totalEquitySen ?? 0
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity
  const isBalanced = totalAssets === totalLiabilitiesAndEquity

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Balance Sheet</h2>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isBalanced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {isBalanced ? 'Balanced' : 'UNBALANCED'}
          </span>
        </div>
        <div className="divide-y divide-gray-100">
          {/* Assets */}
          <BalanceSheetSection title="Assets" rows={assets} totalLabel="Total Assets" totalSen={totalAssets} color="blue" />
          {/* Liabilities */}
          <BalanceSheetSection title="Liabilities" rows={liabilities} totalLabel="Total Liabilities" totalSen={totalLiabilities} color="amber" />
          {/* Equity */}
          <BalanceSheetSection title="Equity" rows={equity} totalLabel="Total Equity" totalSen={totalEquity} color="purple" />
        </div>
      </div>

      {/* Summary Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Total Assets</p>
          <p className="text-2xl font-semibold text-blue-600 mt-1">{formatRinggit(totalAssets)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Total Liabilities + Equity</p>
          <p className="text-2xl font-semibold text-purple-600 mt-1">{formatRinggit(totalLiabilitiesAndEquity)}</p>
        </div>
      </div>
    </div>
  )
}

function BalanceSheetSection({
  title,
  rows,
  totalLabel,
  totalSen,
  color,
}: {
  title: string
  rows: any[]
  totalLabel: string
  totalSen: number
  color: 'blue' | 'amber' | 'purple'
}) {
  const bgMap = { blue: 'bg-blue-50 border-blue-100 text-blue-800', amber: 'bg-amber-50 border-amber-100 text-amber-800', purple: 'bg-purple-50 border-purple-100 text-purple-800' }

  return (
    <div>
      <div className="px-5 py-3 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-4 text-sm text-gray-400">No {title.toLowerCase()} accounts</div>
      ) : (
        rows.map((row: any, i: number) => (
          <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
            <div>
              <span className="text-sm text-gray-600 font-mono mr-2">{row.code}</span>
              <span className="text-sm text-gray-800">{row.name}</span>
            </div>
            <span className="text-sm font-medium text-gray-700">{formatRinggit(row.amount_sen)}</span>
          </div>
        ))
      )}
      <div className={`flex items-center justify-between px-5 py-3 ${bgMap[color]} border-t`}>
        <span className="text-sm font-semibold">{totalLabel}</span>
        <span className="text-sm font-semibold">{formatRinggit(totalSen)}</span>
      </div>
    </div>
  )
}

/* ─── Cash Flow ────────────────────────────────────────────────────────────── */

function CashFlowReport({ query }: { query: ReturnType<typeof useCashFlow> }) {
  const { data, isLoading, error } = query

  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorMessage message="Failed to load cash flow report" />
  if (!data) return <EmptyState message="No cash flow data available" />

  const inflows = Number(data.operating?.inflows ?? 0)
  const outflows = Number(data.operating?.outflows ?? 0)
  const net = Number(data.operating?.net ?? data.total ?? 0)

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h2 className="text-sm font-semibold text-gray-800">Cash Flow Statement</h2>
        <p className="text-xs text-gray-500 mt-1">{data.startDate} to {data.endDate}</p>
      </div>
      <div className="divide-y divide-gray-100">
        {/* Operating Activities */}
        <div>
          <div className="px-5 py-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Operating Activities</p>
          </div>
          <div className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
            <span className="text-sm text-gray-800">Cash Received from Customers</span>
            <span className="text-sm font-medium text-green-700">{formatRinggit(inflows)}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
            <span className="text-sm text-gray-800">Cash Paid to Suppliers</span>
            <span className="text-sm font-medium text-red-600">-{formatRinggit(outflows)}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3 bg-blue-50/50">
            <span className="text-sm font-semibold text-gray-800">Net Operating Cash Flow</span>
            <span className={`text-sm font-semibold ${net >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {net < 0 ? '-' : ''}{formatRinggit(Math.abs(net))}
            </span>
          </div>
        </div>

        {/* Net Cash Change */}
        <div className={`flex items-center justify-between px-5 py-4 ${net >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <span className={`text-base font-bold ${net >= 0 ? 'text-green-900' : 'text-red-900'}`}>
            Net Cash Change
          </span>
          <span className={`text-base font-bold ${net >= 0 ? 'text-green-900' : 'text-red-900'}`}>
            {net < 0 ? '-' : ''}{formatRinggit(Math.abs(net))}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── Aging Report (AR & AP) ───────────────────────────────────────────────── */

function AgingReport({ query, title }: { query: ReturnType<typeof useARAging>; title: string }) {
  const { data, isLoading, error } = query

  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorMessage message={`Failed to load ${title.toLowerCase()}`} />
  if (!data) return <EmptyState message={`No ${title.toLowerCase()} data available`} />

  const rows = data.rows ?? []
  const totals = data.totals ?? {}

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Contact Name</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Current</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">1-30</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">31-60</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">61-90</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">90+</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-gray-400 text-sm">No outstanding amounts</td>
              </tr>
            ) : (
              rows.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-gray-800">{row.contact_name}</td>
                  <td className="px-5 py-3 text-sm text-right text-gray-700">{row.current_sen ? formatRinggit(row.current_sen) : '—'}</td>
                  <td className="px-5 py-3 text-sm text-right text-gray-700">{row.days_1_30_sen ? formatRinggit(row.days_1_30_sen) : '—'}</td>
                  <td className="px-5 py-3 text-sm text-right text-gray-700">{row.days_31_60_sen ? formatRinggit(row.days_31_60_sen) : '—'}</td>
                  <td className="px-5 py-3 text-sm text-right text-gray-700">{row.days_61_90_sen ? formatRinggit(row.days_61_90_sen) : '—'}</td>
                  <td className="px-5 py-3 text-sm text-right text-red-600 font-medium">{row.days_90_plus_sen ? formatRinggit(row.days_90_plus_sen) : '—'}</td>
                  <td className="px-5 py-3 text-sm text-right font-semibold text-gray-900">{formatRinggit(row.total_sen ?? 0)}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td className="px-5 py-3 text-sm font-semibold text-gray-900">Total</td>
                <td className="px-5 py-3 text-sm font-semibold text-right text-gray-900">{formatRinggit(totals.current_sen ?? 0)}</td>
                <td className="px-5 py-3 text-sm font-semibold text-right text-gray-900">{formatRinggit(totals.days_1_30_sen ?? 0)}</td>
                <td className="px-5 py-3 text-sm font-semibold text-right text-gray-900">{formatRinggit(totals.days_31_60_sen ?? 0)}</td>
                <td className="px-5 py-3 text-sm font-semibold text-right text-gray-900">{formatRinggit(totals.days_61_90_sen ?? 0)}</td>
                <td className="px-5 py-3 text-sm font-semibold text-right text-red-700">{formatRinggit(totals.days_90_plus_sen ?? 0)}</td>
                <td className="px-5 py-3 text-sm font-bold text-right text-gray-900">{formatRinggit(totals.total_sen ?? 0)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

/* ─── Shared Components ────────────────────────────────────────────────────── */

function LoadingSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-8 space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 text-center py-12">
      <p className="text-red-500 text-sm">{message}</p>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 text-center py-16">
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  )
}
