'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useInvoice, useUpdateInvoiceStatus, useRecordPayment, useContacts } from '@/hooks/use-accounting'
import { formatDate, formatRinggit } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-600',
  CANCELLED: 'bg-gray-100 text-gray-400',
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: invoice, isLoading, error } = useInvoice(id)
  const updateStatus = useUpdateInvoiceStatus()
  const recordPayment = useRecordPayment()

  const [showPayForm, setShowPayForm] = useState(false)
  const [payForm, setPayForm] = useState({ amountRM: '', method: 'BANK_TRANSFER', reference: '', notes: '' })
  const [payError, setPayError] = useState('')

  const handleMarkSent = async () => {
    await updateStatus.mutateAsync({ id, status: 'SENT' })
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this invoice? This cannot be undone.')) return
    await updateStatus.mutateAsync({ id, status: 'CANCELLED' })
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setPayError('')
    const amountSen = Math.round(parseFloat(payForm.amountRM) * 100)
    if (!amountSen || amountSen <= 0) { setPayError('Enter a valid amount'); return }
    try {
      await recordPayment.mutateAsync({
        type: 'RECEIVED',
        contactId: invoice.contact_id,
        date: new Date().toISOString().slice(0, 10),
        amountSen,
        method: payForm.method as any,
        reference: payForm.reference || undefined,
        notes: payForm.notes || undefined,
        invoiceId: id,
      })
      setShowPayForm(false)
      setPayForm({ amountRM: '', method: 'BANK_TRANSFER', reference: '', notes: '' })
    } catch (err: any) {
      setPayError(err.response?.data?.message ?? 'Failed to record payment')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (error || !invoice) {
    return <div className="text-center py-20 text-red-500">Invoice not found</div>
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500'

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/accounting/invoices" className="text-gray-400 hover:text-gray-600 text-sm">← Invoices</Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-500">{invoice.invoice_no}</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">{invoice.invoice_no}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[invoice.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {invoice.status}
            </span>
            <span className="text-sm text-gray-500">{invoice.contact_name}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/accounting/invoices/${id}/print`}
            target="_blank"
            className="flex items-center gap-1.5 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Print / PDF
          </Link>
          {invoice.status === 'DRAFT' && (
            <button
              onClick={handleMarkSent}
              disabled={updateStatus.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Mark as Sent
            </button>
          )}
          {['SENT', 'PARTIAL', 'OVERDUE'].includes(invoice.status) && (
            <button
              onClick={() => setShowPayForm(true)}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
            >
              Record Payment
            </button>
          )}
          {invoice.status === 'DRAFT' && (
            <button onClick={handleCancel} className="text-sm text-red-500 hover:text-red-600 px-3 py-2">
              Cancel Invoice
            </button>
          )}
        </div>
      </div>

      {/* Payment Recording Form */}
      {showPayForm && (
        <form onSubmit={handleRecordPayment} className="bg-white rounded-xl border border-brand-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Record Payment</h2>
          {payError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{payError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount (RM) <span className="text-red-500">*</span></label>
              <input
                type="number" step="0.01" min="0.01"
                className={inputClass}
                value={payForm.amountRM}
                onChange={e => setPayForm(f => ({ ...f, amountRM: e.target.value }))}
                placeholder={`Balance: ${(Number(invoice.balance_sen) / 100).toFixed(2)}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
              <select className={inputClass} value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="DUITNOW">DuitNow</option>
                <option value="TNG">Touch 'n Go</option>
                <option value="GRABPAY">GrabPay</option>
                <option value="CARD">Card</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reference No.</label>
              <input className={inputClass} value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} placeholder="Cheque no., transaction ID, etc." />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={recordPayment.isPending} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {recordPayment.isPending ? 'Saving...' : 'Record Payment'}
            </button>
            <button type="button" onClick={() => { setShowPayForm(false); setPayError('') }} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
          </div>
        </form>
      )}

      {/* Invoice Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Info</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Invoice No.</span><span className="font-mono font-medium">{invoice.invoice_no}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Issue Date</span><span>{invoice.issue_date ? formatDate(invoice.issue_date) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Due Date</span><span>{invoice.due_date ? formatDate(invoice.due_date) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Currency</span><span>{invoice.currency}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Billed To</h2>
          <div className="text-sm">
            <p className="font-semibold text-gray-900">{invoice.contact_name}</p>
            {invoice.contact_email && <p className="text-gray-500">{invoice.contact_email}</p>}
            {invoice.address_line1 && <p className="text-gray-500 mt-1">{invoice.address_line1}</p>}
            {(invoice.city || invoice.state) && <p className="text-gray-500">{[invoice.city, invoice.state].filter(Boolean).join(', ')}</p>}
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Description</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Qty</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Unit Price</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Disc %</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">SST</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(invoice.lines ?? []).map((line: any) => (
              <tr key={line.id}>
                <td className="px-5 py-3 text-sm text-gray-800">{line.description}</td>
                <td className="px-5 py-3 text-sm text-gray-600 text-right">{Number(line.quantity).toFixed(2)}</td>
                <td className="px-5 py-3 text-sm text-gray-600 text-right">{formatRinggit(Number(line.unit_price_sen))}</td>
                <td className="px-5 py-3 text-sm text-gray-600 text-right">{Number(line.discount_percent) > 0 ? `${Number(line.discount_percent)}%` : '—'}</td>
                <td className="px-5 py-3 text-sm text-gray-600 text-right">{formatRinggit(Number(line.sst_amount_sen))}</td>
                <td className="px-5 py-3 text-sm font-medium text-gray-800 text-right">{formatRinggit(Number(line.total_sen))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-gray-100 px-5 py-4">
          <div className="flex justify-end">
            <div className="space-y-1.5 min-w-[240px]">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span><span>{formatRinggit(Number(invoice.subtotal_sen))}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>SST</span><span>{formatRinggit(Number(invoice.sst_amount_sen))}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-gray-900 border-t border-gray-100 pt-2">
                <span>Total</span><span>{formatRinggit(Number(invoice.total_sen))}</span>
              </div>
              {Number(invoice.paid_sen) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Paid</span><span>− {formatRinggit(Number(invoice.paid_sen))}</span>
                </div>
              )}
              {Number(invoice.balance_sen) > 0 && (
                <div className="flex justify-between text-sm font-semibold text-red-500">
                  <span>Balance Due</span><span>{formatRinggit(Number(invoice.balance_sen))}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {(invoice.notes || invoice.terms) && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {invoice.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-gray-700">{invoice.notes}</p>
            </div>
          )}
          {invoice.terms && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Terms</p>
              <p className="text-sm text-gray-700">{invoice.terms}</p>
            </div>
          )}
        </div>
      )}

      {/* MyInvois */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-amber-800">MyInvois (LHDN e-Invoicing)</p>
          <p className="text-xs text-amber-700 mt-0.5">
            {invoice.myinvois_status ? `Status: ${invoice.myinvois_status}` : 'Not submitted. Configure LHDN API credentials in Settings to enable e-invoicing.'}
          </p>
        </div>
        {!invoice.myinvois_status && (
          <button className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium px-3 py-1.5 rounded-lg" disabled>
            Submit to LHDN
          </button>
        )}
      </div>
    </div>
  )
}
