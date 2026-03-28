'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useInvoices, useBulkUpdateInvoiceStatus } from '@/hooks/use-accounting'
import { formatRinggit, formatDate } from '@/lib/utils'
import { api } from '@/lib/api'

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
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data, isLoading, error } = useInvoices({ status: statusFilter, search: search || undefined, page })
  const invoices = data?.items ?? []
  const meta = data?.meta
  const bulkUpdate = useBulkUpdateInvoiceStatus()

  const handleStatusChange = (status: string | undefined) => {
    setStatusFilter(status)
    setPage(1)
    setSelected(new Set())
  }
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
    setSelected(new Set())
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    if (selected.size === invoices.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(invoices.map((i: any) => i.id)))
    }
  }

  const handleBulkAction = async (status: string) => {
    const ids = Array.from(selected)
    if (!ids.length) return
    await bulkUpdate.mutateAsync({ ids, status })
    setSelected(new Set())
  }

  const handleExportCsv = async () => {
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (search) params.set('search', search)
    params.set('format', 'csv')
    const res = await api.get(`/accounting/invoices?${params.toString()}`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'invoices.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
          <p className="text-gray-500 text-sm mt-1">{meta?.total ?? invoices.length} invoices total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCsv} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            Export CSV
          </button>
          <Link href="/accounting/invoices/new" className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
            + New Invoice
          </Link>
        </div>
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
            <button key={tab.label} onClick={() => handleStatusChange(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[200px] bg-white border border-gray-200 rounded-lg px-3 py-2">
          <input type="text" value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search by invoice no. or customer..." className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none" />
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-medium text-brand-700">{selected.size} invoice{selected.size > 1 ? 's' : ''} selected</p>
          <div className="flex items-center gap-2">
            <button onClick={() => handleBulkAction('SENT')} disabled={bulkUpdate.isPending}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50">
              Mark Sent
            </button>
            <button onClick={() => handleBulkAction('CANCELLED')} disabled={bulkUpdate.isPending}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50">
              Cancel
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-700 ml-2">
              Clear
            </button>
          </div>
        </div>
      )}

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
                <th className="px-3 py-3 w-10">
                  <input type="checkbox" checked={invoices.length > 0 && selected.size === invoices.length} onChange={toggleAll}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                </th>
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
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-gray-400">
                    <p className="text-3xl mb-2">📄</p>
                    <p className="text-sm">{search ? 'No invoices match your search' : 'No invoices yet'}</p>
                    {!search && <Link href="/accounting/invoices/new" className="mt-3 inline-block text-xs text-brand-600 font-medium">Create Invoice →</Link>}
                  </td>
                </tr>
              ) : (
                invoices.map((inv: any) => (
                  <tr key={inv.id} className={`hover:bg-gray-50 transition-colors ${selected.has(inv.id) ? 'bg-brand-50/50' : ''}`}>
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={selected.has(inv.id)} onChange={() => toggleSelect(inv.id)}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                    </td>
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

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
            <p className="text-xs text-gray-500">
              Page {meta.page} of {meta.totalPages} ({meta.total} results)
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
