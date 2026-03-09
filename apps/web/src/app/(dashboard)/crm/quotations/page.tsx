'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuotations, useUpdateQuotationStatus } from '@/hooks/use-crm'
import { formatRinggit, formatDate } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600',
  EXPIRED: 'bg-gray-100 text-gray-400',
  INVOICED: 'bg-purple-100 text-purple-700',
}

export default function QuotationsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const { data: quotations = [], isLoading, error } = useQuotations(statusFilter)
  const updateStatus = useUpdateQuotationStatus()

  const totals = {
    all: (quotations as any[]).length,
    open: (quotations as any[]).filter((q: any) => ['DRAFT', 'SENT'].includes(q.status)).length,
    accepted: (quotations as any[]).filter((q: any) => q.status === 'ACCEPTED').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Quotations</h1>
          <p className="text-gray-500 text-sm mt-1">{totals.all} total · {totals.open} open · {totals.accepted} accepted</p>
        </div>
        <Link href="/crm/quotations/new" className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
          + New Quotation
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'All', value: totals.all, color: 'text-gray-800' },
          { label: 'Open', value: totals.open, color: 'text-blue-600' },
          { label: 'Accepted', value: totals.accepted, color: 'text-green-600' },
          { label: 'Invoiced', value: (quotations as any[]).filter((q: any) => q.status === 'INVOICED').length, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-semibold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { label: 'All', value: undefined },
          { label: 'Draft', value: 'DRAFT' },
          { label: 'Sent', value: 'SENT' },
          { label: 'Accepted', value: 'ACCEPTED' },
          { label: 'Rejected', value: 'REJECTED' },
        ].map(tab => (
          <button key={tab.label} onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 text-sm">Failed to load quotations</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Quotation No.</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Customer</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Issue Date</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Expiry Date</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Total</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(quotations as any[]).length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <p className="text-3xl mb-2">📋</p>
                    <p className="text-sm">No quotations yet</p>
                    <Link href="/crm/quotations/new" className="mt-3 inline-block text-xs text-brand-600 font-medium">Create Quotation →</Link>
                  </td>
                </tr>
              ) : (
                (quotations as any[]).map((q: any) => (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-brand-600">
                      <Link href={`/crm/quotations/${q.id}`} className="hover:underline">{q.quotation_no}</Link>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-800">{q.contact_name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{q.issue_date ? formatDate(q.issue_date) : '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{q.expiry_date ? formatDate(q.expiry_date) : '—'}</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">{formatRinggit(Number(q.total_sen))}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[q.status] ?? 'bg-gray-100 text-gray-600'}`}>{q.status}</span>
                    </td>
                    <td className="px-5 py-3 flex gap-2">
                      {q.status === 'DRAFT' && (
                        <button onClick={() => updateStatus.mutateAsync({ id: q.id, status: 'SENT' })} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Send</button>
                      )}
                      {q.status === 'SENT' && (
                        <>
                          <button onClick={() => updateStatus.mutateAsync({ id: q.id, status: 'ACCEPTED' })} className="text-xs text-green-600 hover:text-green-700 font-medium">Accept</button>
                          <button onClick={() => updateStatus.mutateAsync({ id: q.id, status: 'REJECTED' })} className="text-xs text-red-500 hover:text-red-600 font-medium">Reject</button>
                        </>
                      )}
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
