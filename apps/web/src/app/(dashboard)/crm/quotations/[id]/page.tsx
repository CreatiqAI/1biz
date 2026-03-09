'use client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuotation, useUpdateQuotationStatus } from '@/hooks/use-crm'
import { formatRinggit, formatDate } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600',
  EXPIRED: 'bg-gray-100 text-gray-400',
  INVOICED: 'bg-purple-100 text-purple-700',
}

export default function QuotationDetailPage() {
  const { id } = useParams() as { id: string }
  const { data: quotation, isLoading, error } = useQuotation(id)
  const updateStatus = useUpdateQuotationStatus()

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (error || !quotation) {
    return <div className="text-center py-20 text-red-500">Quotation not found</div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/crm/quotations" className="text-gray-400 hover:text-gray-600 text-sm">← Quotations</Link>
          <h1 className="text-2xl font-semibold text-gray-900 mt-1">{quotation.quotation_no}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_BADGE[quotation.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {quotation.status}
            </span>
            <span className="text-sm text-gray-500">{quotation.contact_name}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {quotation.status === 'DRAFT' && (
            <button
              onClick={() => updateStatus.mutateAsync({ id, status: 'SENT' })}
              disabled={updateStatus.isPending}
              className="text-sm font-medium px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50"
            >
              Mark as Sent
            </button>
          )}
          {quotation.status === 'SENT' && (
            <>
              <button
                onClick={() => updateStatus.mutateAsync({ id, status: 'ACCEPTED' })}
                disabled={updateStatus.isPending}
                className="text-sm font-medium px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50"
              >
                Accept
              </button>
              <button
                onClick={() => updateStatus.mutateAsync({ id, status: 'REJECTED' })}
                disabled={updateStatus.isPending}
                className="text-sm font-medium px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50"
              >
                Reject
              </button>
            </>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Quotation Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Customer</span><span className="font-medium text-gray-800">{quotation.contact_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Issue Date</span><span className="text-gray-800">{quotation.issue_date ? formatDate(quotation.issue_date) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Expiry Date</span><span className="text-gray-800">{quotation.expiry_date ? formatDate(quotation.expiry_date) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Currency</span><span className="text-gray-800">{quotation.currency ?? 'MYR'}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Totals</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="text-gray-800">{formatRinggit(Number(quotation.subtotal_sen ?? 0))}</span></div>
            {Number(quotation.sst_amount_sen ?? 0) > 0 && (
              <div className="flex justify-between"><span className="text-gray-500">SST</span><span className="text-gray-800">{formatRinggit(Number(quotation.sst_amount_sen))}</span></div>
            )}
            {Number(quotation.discount_sen ?? 0) > 0 && (
              <div className="flex justify-between"><span className="text-gray-500">Discount</span><span className="text-red-500">-{formatRinggit(Number(quotation.discount_sen))}</span></div>
            )}
            <div className="flex justify-between border-t border-gray-100 pt-2">
              <span className="font-semibold text-gray-800">Total</span>
              <span className="font-bold text-lg text-gray-900">{formatRinggit(Number(quotation.total_sen ?? 0))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Line Items</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Description</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Qty</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Unit Price</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Discount</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(quotation.lines ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400 text-sm">No line items</td>
              </tr>
            ) : (
              (quotation.lines ?? []).map((line: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm text-gray-800">{line.description ?? line.product_name ?? '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-600 text-right">{Number(line.quantity ?? 0).toFixed(2)}</td>
                  <td className="px-5 py-3 text-sm text-gray-600 text-right">{formatRinggit(Number(line.unit_price_sen ?? 0))}</td>
                  <td className="px-5 py-3 text-sm text-gray-600 text-right">
                    {Number(line.discount_percent ?? 0) > 0 ? `${line.discount_percent}%` : '—'}
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900 text-right">{formatRinggit(Number(line.total_sen ?? 0))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {quotation.notes && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">Notes</h2>
          <p className="text-sm text-gray-600">{quotation.notes}</p>
        </div>
      )}
    </div>
  )
}
