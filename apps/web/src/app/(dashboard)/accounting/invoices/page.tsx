'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useInvoices } from '@/hooks/use-accounting'
import { formatRinggit, formatDate } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-600',
  CANCELLED: 'bg-gray-100 text-gray-400',
}

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [search, setSearch] = useState('')
  const { data: invoices = [], isLoading, error } = useInvoices(statusFilter)

  const filtered = invoices.filter((inv: any) => {
    if (!search) return true
    const q = search.toLowerCase()
    return inv.invoice_no?.toLowerCase().includes(q) || inv.contact_name?.toLowerCase().includes(q)
  })

  const totals = {
    all: invoices.length,
    outstanding: invoices.filter((i: any) => ['SENT', 'PARTIAL', 'OVERDUE'].includes(i.status)).length,
    paid: invoices.filter((i: any) => i.status === 'PAID').length,
    draft: invoices.filter((i: any) => i.status === 'DRAFT').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
          <p className="text-gray-500 text-sm mt-1">{invoices.length} invoices total</p>
        </div>
        <Link href="/accounting/invoices/new" className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          + New Invoice
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Invoices', value: totals.all, color: 'text-gray-800' },
          { label: 'Outstanding', value: totals.outstanding, color: 'text-amber-600' },
          { label: 'Paid', value: totals.paid, color: 'text-green-600' },
          { label: 'Draft', value: totals.draft, color: 'text-gray-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-semibold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { label: 'All', value: undefined },
            { label: 'Draft', value: 'DRAFT' },
            { label: 'Sent', value: 'SENT' },
            { label: 'Paid', value: 'PAID' },
            { label: 'Overdue', value: 'OVERDUE' },
          ].map((tab) => (
            <button key={tab.label} onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[200px] bg-white border border-gray-200 rounded-lg px-3 py-2">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by invoice no. or customer..." className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 text-sm">Failed to load invoices</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Invoice No.</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Customer</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Issue Date</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Due Date</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Total</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Balance</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-400">
                    <p className="text-3xl mb-2">📄</p>
                    <p className="text-sm">{search ? 'No invoices match your search' : 'No invoices yet'}</p>
                    {!search && <Link href="/accounting/invoices/new" className="mt-3 inline-block text-xs text-brand-600 font-medium">Create Invoice →</Link>}
                  </td>
                </tr>
              ) : (
                filtered.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-brand-600">{inv.invoice_no}</td>
                    <td className="px-5 py-3 text-sm text-gray-800">{inv.contact_name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{inv.issue_date ? formatDate(inv.issue_date) : '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{inv.due_date ? formatDate(inv.due_date) : '—'}</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">{formatRinggit(Number(inv.total_sen))}</td>
                    <td className="px-5 py-3 text-sm font-medium text-red-500">{formatRinggit(Number(inv.balance_sen))}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>{inv.status}</span>
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/accounting/invoices/${inv.id}`} className="text-xs text-brand-600 hover:text-brand-700 font-medium">View</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
