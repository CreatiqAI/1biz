'use client'
import Link from 'next/link'
import { useAccountingStats } from '@/hooks/use-accounting'
import { formatRinggit, formatDate } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-500',
  SENT: 'bg-blue-100 text-blue-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-600',
}

export default function AccountingPage() {
  const { data: stats, isLoading } = useAccountingStats()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-semibold text-gray-900">Accounting</h1></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[...Array(2)].map((_, i) => <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  const revGrowth = stats?.revenueThisMonth?.growthPct
  const expGrowth = stats?.expensesThisMonth?.growthPct

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Accounting</h1>
        <p className="text-gray-500 text-sm mt-1">Financial overview of your business</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/accounting/invoices?status=SENT" className="bg-white rounded-xl border border-gray-100 p-5 hover:border-brand-200 transition-colors">
          <p className="text-xs text-gray-500 mb-1">Total Receivable</p>
          <p className="text-2xl font-semibold text-green-600">{formatRinggit(stats?.receivable?.totalSen ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-1">{stats?.receivable?.count ?? 0} unpaid invoice{(stats?.receivable?.count ?? 0) !== 1 ? 's' : ''}</p>
        </Link>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Total Payable</p>
          <p className="text-2xl font-semibold text-red-500">{formatRinggit(stats?.payable?.totalSen ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-1">{stats?.payable?.count ?? 0} outgoing payment{(stats?.payable?.count ?? 0) !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/accounting/payments" className="bg-white rounded-xl border border-gray-100 p-5 hover:border-brand-200 transition-colors">
          <p className="text-xs text-gray-500 mb-1">Revenue This Month</p>
          <p className="text-2xl font-semibold text-brand-600">{formatRinggit(stats?.revenueThisMonth?.totalSen ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {revGrowth !== null && revGrowth !== undefined
              ? `${revGrowth >= 0 ? '+' : ''}${revGrowth}% vs last month`
              : 'First month of data'}
          </p>
        </Link>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Expenses This Month</p>
          <p className="text-2xl font-semibold text-amber-600">{formatRinggit(stats?.expensesThisMonth?.totalSen ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {expGrowth !== null && expGrowth !== undefined
              ? `${expGrowth >= 0 ? '+' : ''}${expGrowth}% vs last month`
              : 'First month of data'}
          </p>
        </div>
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
              (stats?.recentPayments ?? []).map((pay: any) => (
                <div key={pay.id ?? pay.payment_no} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{pay.contact_name}</p>
                    <p className="text-xs text-gray-400">{pay.payment_no} · {pay.date ? formatDate(pay.date) : ''} · {pay.method?.replace('_', ' ') ?? '—'}</p>
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

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Invoices', desc: 'Create & send invoices to customers', href: '/accounting/invoices', icon: '📄' },
          { label: 'Payments', desc: 'Record incoming & outgoing payments', href: '/accounting/payments', icon: '💳' },
          { label: 'Contacts', desc: 'Manage customers & suppliers', href: '/accounting/contacts', icon: '👥' },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-colors"
          >
            <span className="text-2xl">{link.icon}</span>
            <div>
              <p className="text-sm font-medium text-gray-800">{link.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{link.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
