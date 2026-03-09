'use client'
import { useParams } from 'next/navigation'
import { useInvoice } from '@/hooks/use-accounting'
import { useAuthStore } from '@/store/auth.store'
import { formatDate, formatRinggit } from '@/lib/utils'
import { useEffect } from 'react'

export default function InvoicePrintPage() {
  const { id } = useParams() as { id: string }
  const { data: invoice, isLoading } = useInvoice(id)
  const user = useAuthStore((s) => s.user)
  const companyName = user?.companyName ?? 'Your Company'

  useEffect(() => {
    if (invoice) {
      document.title = `Invoice ${invoice.invoice_no}`
    }
  }, [invoice])

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading invoice...</div>
  if (!invoice) return <div className="p-8 text-center text-red-500">Invoice not found</div>

  return (
    <div className="min-h-screen bg-white">
      {/* Print controls — hidden when printing */}
      <div className="print:hidden bg-gray-100 px-6 py-3 flex items-center justify-between border-b">
        <p className="text-sm text-gray-600">Print preview — use browser print (Ctrl+P) to save as PDF</p>
        <button
          onClick={() => window.print()}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          Print / Save PDF
        </button>
      </div>

      {/* Invoice Document */}
      <div className="max-w-[800px] mx-auto p-12 print:p-8">
        {/* Company header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{companyName}</h1>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-200 uppercase tracking-widest">Invoice</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{invoice.invoice_no}</p>
          </div>
        </div>

        {/* Billing info + dates */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bill To</p>
            <p className="font-semibold text-gray-900">{invoice.contact_name}</p>
            {invoice.contact_email && <p className="text-sm text-gray-600">{invoice.contact_email}</p>}
            {invoice.address_line1 && <p className="text-sm text-gray-600 mt-1">{invoice.address_line1}</p>}
            {(invoice.city || invoice.state) && (
              <p className="text-sm text-gray-600">{[invoice.city, invoice.state].filter(Boolean).join(', ')}</p>
            )}
          </div>
          <div className="text-right space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Issue Date</span>
              <span className="text-sm font-medium">{invoice.issue_date ? formatDate(invoice.issue_date) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Due Date</span>
              <span className="text-sm font-medium">{invoice.due_date ? formatDate(invoice.due_date) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Currency</span>
              <span className="text-sm font-medium">{invoice.currency}</span>
            </div>
          </div>
        </div>

        {/* Line items */}
        <table className="w-full mb-6 border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-900">
              <th className="text-left text-xs font-semibold text-gray-700 uppercase pb-2 pr-4">Description</th>
              <th className="text-right text-xs font-semibold text-gray-700 uppercase pb-2 pr-4">Qty</th>
              <th className="text-right text-xs font-semibold text-gray-700 uppercase pb-2 pr-4">Unit Price</th>
              <th className="text-right text-xs font-semibold text-gray-700 uppercase pb-2 pr-4">Disc</th>
              <th className="text-right text-xs font-semibold text-gray-700 uppercase pb-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.lines ?? []).map((line: any, i: number) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-3 pr-4 text-sm text-gray-800">{line.description}</td>
                <td className="py-3 pr-4 text-sm text-gray-600 text-right">{Number(line.quantity).toFixed(2)}</td>
                <td className="py-3 pr-4 text-sm text-gray-600 text-right">{formatRinggit(Number(line.unit_price_sen))}</td>
                <td className="py-3 pr-4 text-sm text-gray-600 text-right">
                  {Number(line.discount_percent) > 0 ? `${Number(line.discount_percent)}%` : '—'}
                </td>
                <td className="py-3 text-sm font-medium text-gray-900 text-right">{formatRinggit(Number(line.total_sen))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="min-w-[260px] space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span>{formatRinggit(Number(invoice.subtotal_sen))}</span>
            </div>
            {Number(invoice.sst_amount_sen) > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>SST ({invoice.sst_type})</span><span>{formatRinggit(Number(invoice.sst_amount_sen))}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 border-t-2 border-gray-900 pt-2">
              <span>Total Due</span><span>{formatRinggit(Number(invoice.total_sen))}</span>
            </div>
            {Number(invoice.paid_sen) > 0 && (
              <div className="flex justify-between text-sm text-green-700">
                <span>Amount Paid</span><span>− {formatRinggit(Number(invoice.paid_sen))}</span>
              </div>
            )}
            {Number(invoice.balance_sen) > 0 && (
              <div className="flex justify-between text-base font-bold text-red-600 border-t border-gray-200 pt-1.5">
                <span>Balance Due</span><span>{formatRinggit(Number(invoice.balance_sen))}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notes & Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="border-t border-gray-200 pt-6 space-y-3">
            {invoice.notes && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-gray-700">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Payment Terms</p>
                <p className="text-sm text-gray-700">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-gray-200 pt-6 mt-8 text-center text-xs text-gray-400">
          Thank you for your business · {companyName}
        </div>
      </div>
    </div>
  )
}
