'use client'
import { useState } from 'react'
import { useBills, useCreateBill, useApproveBill, usePayBill, useDeleteBill, useContacts, useAccounts } from '@/hooks/use-accounting'
import { formatRinggit, formatDate } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  APPROVED: 'bg-blue-100 text-blue-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-600',
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'DUITNOW', label: 'DuitNow' },
  { value: 'TNG', label: "Touch 'n Go" },
  { value: 'GRABPAY', label: 'GrabPay' },
  { value: 'CARD', label: 'Card' },
]

interface LineItem {
  description: string
  quantity: string
  unitPriceRM: string
  discountPercent: string
  sstRate: string
  accountId: string
}

const emptyLine = (): LineItem => ({
  description: '', quantity: '1', unitPriceRM: '', discountPercent: '0', sstRate: '0', accountId: '',
})

export default function BillsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [payBillId, setPayBillId] = useState('')
  const [payBillBalance, setPayBillBalance] = useState(0)

  const { data: bills = [], isLoading, error } = useBills()
  const { data: contacts = [] } = useContacts()
  const { data: accounts = [] } = useAccounts()
  const createBill = useCreateBill()
  const approveBill = useApproveBill()
  const payBill = usePayBill()
  const deleteBill = useDeleteBill()

  // Create form state
  const [contactId, setContactId] = useState('')
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineItem[]>([emptyLine()])
  const [createError, setCreateError] = useState('')

  // Pay form state
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10))
  const [payMethod, setPayMethod] = useState('')
  const [payReference, setPayReference] = useState('')
  const [payError, setPayError] = useState('')

  // Suppliers only
  const suppliers = (contacts as any[]).filter((c: any) => c.type === 'SUPPLIER' || c.type === 'BOTH')

  // Filter bills
  const filtered = (bills as any[]).filter((b: any) => !statusFilter || b.status === statusFilter)

  // Summary calculations
  const totalOutstanding = (bills as any[])
    .filter((b: any) => b.status !== 'PAID' && b.status !== 'CANCELLED')
    .reduce((s: number, b: any) => s + Number(b.balance_sen || 0), 0)
  const totalPaid = (bills as any[])
    .reduce((s: number, b: any) => s + Number(b.paid_sen || 0), 0)

  // Line item helpers
  const updateLine = (i: number, field: keyof LineItem, value: string) =>
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [field]: value } : l))

  const addLine = () => setLines(ls => [...ls, emptyLine()])
  const removeLine = (i: number) => setLines(ls => ls.filter((_, idx) => idx !== i))

  const computedLines = lines.map(l => {
    const qty = parseFloat(l.quantity) || 0
    const price = parseFloat(l.unitPriceRM) || 0
    const disc = parseFloat(l.discountPercent) || 0
    const sstRate = parseFloat(l.sstRate) || 0
    const subtotal = qty * price * (1 - disc / 100)
    const sst = subtotal * sstRate / 100
    return { subtotal, sst, total: subtotal + sst }
  })

  const subtotalRM = computedLines.reduce((s, l) => s + l.subtotal, 0)
  const sstRM = computedLines.reduce((s, l) => s + l.sst, 0)
  const totalRM = subtotalRM + sstRM

  const resetCreateForm = () => {
    setContactId('')
    setBillDate(new Date().toISOString().slice(0, 10))
    setDueDate('')
    setNotes('')
    setLines([emptyLine()])
    setCreateError('')
  }

  const resetPayForm = () => {
    setPayAmount('')
    setPayDate(new Date().toISOString().slice(0, 10))
    setPayMethod('')
    setPayReference('')
    setPayError('')
    setPayBillId('')
    setPayBillBalance(0)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')

    if (!contactId) { setCreateError('Please select a supplier'); return }
    if (!billDate) { setCreateError('Please select a bill date'); return }
    if (lines.every(l => !l.description)) { setCreateError('Add at least one line item'); return }

    const linesData = lines.filter(l => l.description).map(l => ({
      description: l.description,
      quantity: parseFloat(l.quantity) || 1,
      unitPriceSen: Math.round((parseFloat(l.unitPriceRM) || 0) * 100),
      discountPercent: parseFloat(l.discountPercent) || 0,
      sstRate: parseFloat(l.sstRate) || 0,
      accountId: l.accountId || undefined,
    }))

    try {
      await createBill.mutateAsync({
        contactId,
        billDate,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        lines: linesData,
      })
      setShowCreateModal(false)
      resetCreateForm()
    } catch (err: any) {
      setCreateError(err.response?.data?.message ?? 'Failed to create bill')
    }
  }

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPayError('')

    if (!payAmount || !payDate) { setPayError('Please fill in all required fields'); return }

    const amountNum = parseFloat(payAmount)
    if (isNaN(amountNum) || amountNum <= 0) { setPayError('Please enter a valid amount greater than 0'); return }

    const amountSen = Math.round(amountNum * 100)

    try {
      await payBill.mutateAsync({
        id: payBillId,
        amountSen,
        date: payDate,
        method: payMethod || undefined,
        reference: payReference || undefined,
      })
      setShowPayModal(false)
      resetPayForm()
    } catch (err: any) {
      setPayError(err.response?.data?.message ?? 'Failed to record payment')
    }
  }

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this bill?')) return
    try { await approveBill.mutateAsync(id) } catch {}
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft bill? This cannot be undone.')) return
    try { await deleteBill.mutateAsync(id) } catch {}
  }

  const openPayModal = (bill: any) => {
    resetPayForm()
    setPayBillId(bill.id)
    setPayBillBalance(Number(bill.balance_sen || 0))
    setShowPayModal(true)
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
  const cellInput = 'w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-500'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Bills</h1>
          <p className="text-gray-500 text-sm mt-1">Track vendor bills & accounts payable</p>
        </div>
        <button
          onClick={() => { resetCreateForm(); setShowCreateModal(true) }}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          + New Bill
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Total Outstanding</p>
          <p className="text-2xl font-semibold text-amber-600 mt-1">{formatRinggit(totalOutstanding)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {(bills as any[]).filter((b: any) => b.status !== 'PAID' && b.status !== 'CANCELLED').length} unpaid bills
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Total Paid</p>
          <p className="text-2xl font-semibold text-emerald-600 mt-1">{formatRinggit(totalPaid)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {(bills as any[]).filter((b: any) => b.status === 'PAID').length} paid bills
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { label: 'All', value: undefined },
          { label: 'Draft', value: 'DRAFT' },
          { label: 'Approved', value: 'APPROVED' },
          { label: 'Partial', value: 'PARTIAL' },
          { label: 'Paid', value: 'PAID' },
          { label: 'Cancelled', value: 'CANCELLED' },
        ].map((tab) => (
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
          <div className="text-center py-12 text-red-500 text-sm">Failed to load bills</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Bill No</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Supplier</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Due Date</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Total (RM)</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Paid (RM)</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Balance (RM)</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-gray-400">
                    <p className="text-3xl mb-2">📋</p>
                    <p className="text-sm">No bills found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-600">{b.bill_date ? formatDate(b.bill_date) : '—'}</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">{b.bill_no}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{b.contact_name ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{b.due_date ? formatDate(b.due_date) : '—'}</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">{formatRinggit(Number(b.total_sen || 0))}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{formatRinggit(Number(b.paid_sen || 0))}</td>
                    <td className="px-5 py-3 text-sm font-medium text-red-500">{formatRinggit(Number(b.balance_sen || 0))}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {b.status === 'DRAFT' && (
                          <>
                            <button
                              onClick={() => handleApprove(b.id)}
                              disabled={approveBill.isPending}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDelete(b.id)}
                              disabled={deleteBill.isPending}
                              className="text-xs text-red-500 hover:text-red-600 font-medium disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {(b.status === 'APPROVED' || b.status === 'PARTIAL') && (
                          <button
                            onClick={() => openPayModal(b)}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Bill Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-lg font-semibold text-gray-900">New Bill</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleCreateSubmit} className="px-6 py-5 space-y-5">
              {createError && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-lg">{createError}</div>
              )}

              {/* Bill Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <label className={labelClass}>Supplier <span className="text-red-400">*</span></label>
                  <select
                    value={contactId}
                    onChange={(e) => setContactId(e.target.value)}
                    className={inputClass}
                    required
                  >
                    <option value="">Select supplier...</option>
                    {suppliers.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.company_name ? ` — ${c.company_name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Bill Date <span className="text-red-400">*</span></label>
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <label className={labelClass}>Line Items</label>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3 w-[26%]">Description *</th>
                        <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3 w-[7%]">Qty</th>
                        <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3 w-[14%]">Unit Price (RM)</th>
                        <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3 w-[9%]">Disc %</th>
                        <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3 w-[8%]">SST %</th>
                        <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3 w-[20%]">Account</th>
                        <th className="text-right text-xs text-gray-400 font-medium pb-2 w-[12%]">Line Total</th>
                        <th className="w-[4%]" />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-2 pr-3">
                            <input className={cellInput} value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Description" />
                          </td>
                          <td className="py-2 pr-3">
                            <input type="number" step="0.001" min="0.001" className={cellInput} value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                          </td>
                          <td className="py-2 pr-3">
                            <input type="number" step="0.01" min="0" className={cellInput} value={line.unitPriceRM} onChange={e => updateLine(i, 'unitPriceRM', e.target.value)} placeholder="0.00" />
                          </td>
                          <td className="py-2 pr-3">
                            <input type="number" step="0.01" min="0" max="100" className={cellInput} value={line.discountPercent} onChange={e => updateLine(i, 'discountPercent', e.target.value)} />
                          </td>
                          <td className="py-2 pr-3">
                            <input type="number" step="0.01" min="0" max="20" className={cellInput} value={line.sstRate} onChange={e => updateLine(i, 'sstRate', e.target.value)} />
                          </td>
                          <td className="py-2 pr-3">
                            <select className={cellInput} value={line.accountId} onChange={e => updateLine(i, 'accountId', e.target.value)}>
                              <option value="">Select account...</option>
                              {(accounts as any[]).map((a: any) => (
                                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 text-right text-xs font-medium text-gray-800">
                            {computedLines[i].total.toFixed(2)}
                          </td>
                          <td className="py-2 pl-2 text-center">
                            {lines.length > 1 && (
                              <button type="button" onClick={() => removeLine(i)} className="text-gray-300 hover:text-red-400 text-sm leading-none">✕</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" onClick={addLine} className="text-xs text-brand-600 hover:text-brand-700 font-medium mt-2">+ Add Line</button>
              </div>

              {/* Notes */}
              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span><span>RM {subtotalRM.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>SST</span><span>RM {sstRM.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold text-gray-900 border-t border-gray-200 pt-2 mt-2">
                  <span>Total</span><span>RM {totalRM.toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBill.isPending}
                  className="flex-1 bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {createBill.isPending ? 'Creating...' : 'Create Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Bill Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Pay Bill</h2>
              <button onClick={() => { setShowPayModal(false); resetPayForm() }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handlePaySubmit} className="px-6 py-5 space-y-4">
              {payError && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-lg">{payError}</div>
              )}

              <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600">
                Outstanding balance: <span className="font-semibold text-gray-900">{formatRinggit(payBillBalance)}</span>
              </div>

              {/* Amount */}
              <div>
                <label className={labelClass}>Amount (RM) <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="0.00"
                  className={inputClass}
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label className={labelClass}>Date <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              {/* Method */}
              <div>
                <label className={labelClass}>Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select method...</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Reference */}
              <div>
                <label className={labelClass}>Reference</label>
                <input
                  type="text"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  placeholder="e.g. cheque no., transfer ref"
                  className={inputClass}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowPayModal(false); resetPayForm() }}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payBill.isPending}
                  className="flex-1 bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {payBill.isPending ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
