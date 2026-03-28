'use client'
import Link from 'next/link'
import { useDashboardStats } from '@/hooks/use-accounting'
import { formatRinggit, formatDate } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-500',
  SENT: 'bg-blue-100 text-blue-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-600',
}

function StatCard({ title, value, sub, color = 'text-gray-900', href }: {
  title: string; value: string; sub?: string; color?: string; href?: string
}) {
  const inner = (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:border-brand-200 transition-colors">
      <p className="text-xs text-gray-500 mb-1">{title}</p>
      <p className={`text-2xl font-semibold mt-0.5 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[...Array(2)].map((_, i) => <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  const thisMonth = stats?.invoices?.billedThisMonthSen ?? 0
  const lastMonth = stats?.invoices?.billedLastMonthSen ?? 0
  const growth = lastMonth > 0 ? Math.round((thisMonth - lastMonth) / lastMonth * 100) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back — here's what's happening today</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Outstanding Invoices"
          value={formatRinggit(stats?.invoices?.outstanding?.amountSen ?? 0)}
          sub={`${stats?.invoices?.outstanding?.count ?? 0} invoice${(stats?.invoices?.outstanding?.count ?? 0) !== 1 ? 's' : ''}`}
          color="text-amber-600"
          href="/accounting/invoices?status=SENT"
        />
        <StatCard
          title="Billed This Month"
          value={formatRinggit(thisMonth)}
          sub={growth !== null ? `${growth >= 0 ? '+' : ''}${growth}% vs last month` : 'First month of data'}
          color="text-brand-600"
          href="/accounting/invoices"
        />
        <StatCard
          title="Active Employees"
          value={String(stats?.employees?.active ?? 0)}
          sub="Including probation"
          href="/hr/employees"
        />
        <StatCard
          title="Low Stock Items"
          value={String(stats?.lowStock?.count ?? 0)}
          sub="At or below reorder point"
          color={(stats?.lowStock?.count ?? 0) > 0 ? 'text-red-500' : 'text-green-600'}
          href="/inventory/products"
        />
      </div>

      {/* Recent Invoices + Recent Payments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Recent Invoices */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Recent Invoices</h2>
            <Link href="/accounting/invoices" className="text-xs text-brand-600 hover:text-brand-700 font-medium">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(stats?.recentInvoices ?? []).length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">No invoices yet</div>
            ) : (
              (stats?.recentInvoices ?? []).map((inv: any) => (
                <Link key={inv.id} href={`/accounting/invoices/${inv.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{inv.contact_name}</p>
                    <p className="text-xs text-gray-400 font-mono">{inv.invoice_no} · {inv.issue_date ? formatDate(inv.issue_date) : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">{formatRinggit(Number(inv.total_sen))}</p>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${STATUS_BADGE[inv.status] ?? 'bg-gray-100 text-gray-500'}`}>{inv.status}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
          <div className="px-5 py-3 border-t border-gray-50">
            <Link href="/accounting/invoices/new" className="text-xs text-brand-600 hover:text-brand-700 font-medium">+ New Invoice</Link>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Recent Payments</h2>
            <Link href="/accounting/payments" className="text-xs text-brand-600 hover:text-brand-700 font-medium">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(stats?.recentPayments ?? []).length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">No payments yet</div>
            ) : (
              (stats?.recentPayments ?? []).map((pay: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{pay.contact_name}</p>
                    <p className="text-xs text-gray-400">{pay.date ? formatDate(pay.date) : ''} · {pay.method?.replace('_', ' ') ?? '—'}</p>
                  </div>
                  <p className={`text-sm font-semibold ${pay.type === 'RECEIVED' ? 'text-green-600' : 'text-red-500'}`}>
                    {pay.type === 'RECEIVED' ? '+' : '−'}{formatRinggit(Number(pay.amount_sen))}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      {(stats?.revenueChart ?? []).length > 0 && (() => {
        const chart = stats?.revenueChart ?? []
        const maxSen = Math.max(...chart.map((r: any) => Math.max(Number(r.billed_sen), Number(r.collected_sen))), 1)
        return (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-800">Revenue (Last 6 Months)</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-brand-500" />
                  <span className="text-[11px] text-gray-500">Billed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  <span className="text-[11px] text-gray-500">Collected</span>
                </div>
              </div>
            </div>
            {/* Bar chart */}
            <div className="flex items-end gap-2 h-40">
              {chart.map((row: any) => {
                const billedPct = Math.max(Math.round(Number(row.billed_sen) / maxSen * 100), 2)
                const collectedPct = Math.max(Math.round(Number(row.collected_sen) / maxSen * 100), 2)
                return (
                  <div key={row.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center gap-0.5" style={{ height: '128px' }}>
                      <div className="w-[40%] bg-brand-400 rounded-t transition-all hover:bg-brand-500" style={{ height: `${billedPct}%` }} title={`Billed: ${formatRinggit(Number(row.billed_sen))}`} />
                      <div className="w-[40%] bg-emerald-400 rounded-t transition-all hover:bg-emerald-500" style={{ height: `${collectedPct}%` }} title={`Collected: ${formatRinggit(Number(row.collected_sen))}`} />
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1">{row.month}</span>
                  </div>
                )
              })}
            </div>
            {/* Summary row */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
              <div>
                <span className="text-xs text-gray-400">Total Billed</span>
                <p className="text-sm font-semibold text-gray-800">{formatRinggit(chart.reduce((s: number, r: any) => s + Number(r.billed_sen), 0))}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400">Total Collected</span>
                <p className="text-sm font-semibold text-emerald-600">{formatRinggit(chart.reduce((s: number, r: any) => s + Number(r.collected_sen), 0))}</p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'New Invoice', href: '/accounting/invoices/new', icon: '📄' },
          { label: 'Add Employee', href: '/hr/employees/new', icon: '👤' },
          { label: 'Record Stock', href: '/inventory/stock', icon: '📦' },
          { label: 'New Quotation', href: '/crm/quotations/new', icon: '📋' },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="bg-white border border-gray-100 rounded-xl p-4 text-center hover:border-brand-200 hover:bg-brand-50 transition-colors"
          >
            <p className="text-2xl mb-1">{action.icon}</p>
            <p className="text-xs font-medium text-gray-700">{action.label}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
