'use client'
import { useState } from 'react'
import { usePayments, useContacts, useRecordPayment } from '@/hooks/use-accounting'
import { formatRinggit, formatDate } from '@/lib/utils'

const METHOD_BADGE: Record<string, string> = {
  CASH: 'bg-green-100 text-green-700',
  BANK_TRANSFER: 'bg-blue-100 text-blue-700',
  CHEQUE: 'bg-gray-100 text-gray-600',
  DUITNOW: 'bg-purple-100 text-purple-700',
  TNG: 'bg-blue-100 text-blue-600',
  GRABPAY: 'bg-green-100 text-green-600',
  CARD: 'bg-amber-100 text-amber-700',
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'DUITNOW', label: 'DuitNow' },
  { value: 'TNG', label: 'Touch \'n Go' },
  { value: 'GRABPAY', label: 'GrabPay' },
  { value: 'CARD', label: 'Card' },
]

export default function PaymentsPage() {
  const [typeFilter, setTypeFilter] = useState<'RECEIVED' | 'MADE' | undefined>(undefined)
  const [showModal, setShowModal] = useState(false)
  const { data: payments = [], isLoading, error } = usePayments()
  const { data: contacts = [] } = useContacts()
  const recordPayment = useRecordPayment()

  // Form state
  const [type, setType] = useState<'RECEIVED' | 'MADE'>('RECEIVED')
  const [contactId, setContactId] = useState('')
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState('')

  const filtered = payments.filter((p: any) => !typeFilter || p.type === typeFilter)
  const totalIn = payments.filter((p: any) => p.type === 'RECEIVED').reduce((s: number, p: any) => s + Number(p.amount_sen), 0)
  const totalOut = payments.filter((p: any) => p.type === 'MADE').reduce((s: number, p: any) => s + Number(p.amount_sen), 0)

  const resetForm = () => {
    setType('RECEIVED')
    setContactId('')
    setDate('')
    setAmount('')
    setMethod('')
    setReference('')
    setNotes('')
    setFormError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!contactId || !date || !amount) {
      setFormError('Please fill in all required fields')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError('Please enter a valid amount greater than 0')
      return
    }

    const amountSen = Math.round(amountNum * 100)

    try {
      await recordPayment.mutateAsync({
        type,
        contactId,
        date,
        amountSen,
        method: method || undefined,
        reference: reference || undefined,
        notes: notes || undefined,
      })
      setShowModal(false)
      resetForm()
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Failed to record payment')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
          <p className="text-gray-500 text-sm mt-1">All incoming and outgoing payments</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          + Record Payment
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Total Received</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">{formatRinggit(totalIn)}</p>
          <p className="text-xs text-gray-400 mt-1">{payments.filter((p: any) => p.type === 'RECEIVED').length} transactions</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Total Paid Out</p>
          <p className="text-2xl font-semibold text-red-500 mt-1">{formatRinggit(totalOut)}</p>
          <p className="text-xs text-gray-400 mt-1">{payments.filter((p: any) => p.type === 'MADE').length} transactions</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { label: 'All', value: undefined },
          { label: 'Received', value: 'RECEIVED' as const },
          { label: 'Made', value: 'MADE' as const },
        ].map((tab) => (
          <button key={tab.label} onClick={() => setTypeFilter(tab.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${typeFilter === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 text-sm">Failed to load payments</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Reference</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Contact</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Method</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Amount</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400">
                    <p className="text-3xl mb-2">💳</p>
                    <p className="text-sm">No payment records yet</p>
                  </td>
                </tr>
              ) : (
                filtered.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-600">{p.date ? formatDate(p.date) : '—'}</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">{p.payment_no}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{p.contact_name ?? '—'}</td>
                    <td className="px-5 py-3">
                      {p.method ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${METHOD_BADGE[p.method] ?? 'bg-gray-100 text-gray-600'}`}>{p.method.replace('_', ' ')}</span>
                      ) : '—'}
                    </td>
                    <td className={`px-5 py-3 text-sm font-semibold ${p.type === 'RECEIVED' ? 'text-green-600' : 'text-red-500'}`}>
                      {p.type === 'RECEIVED' ? '+' : '-'}{formatRinggit(Number(p.amount_sen))}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{p.type}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Record Payment</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-lg">{formError}</div>
              )}

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type <span className="text-red-400">*</span></label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'RECEIVED' | 'MADE')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                >
                  <option value="RECEIVED">Received</option>
                  <option value="MADE">Made</option>
                </select>
              </div>

              {/* Contact */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact <span className="text-red-400">*</span></label>
                <select
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                >
                  <option value="">Select contact...</option>
                  {(contacts as any[]).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.company_name ? ` (${c.company_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (RM) <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                >
                  <option value="">Select method...</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. cheque no., transfer ref"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordPayment.isPending}
                  className="flex-1 bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {recordPayment.isPending ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
