'use client'
import { useState, useMemo } from 'react'
import {
  useEmployees, useClaims, useClaimTypes, useCreateClaim, useApproveClaim, useRejectClaim,
} from '@/hooks/use-hr'
import { formatDate, formatRinggit } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  PAID: 'bg-blue-100 text-blue-700',
}

interface ClaimLine {
  claimTypeId: string
  description: string
  amount: string
  date: string
}

const emptyLine = (): ClaimLine => ({ claimTypeId: '', description: '', amount: '', date: '' })

export default function ClaimsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const { data: claims = [], isLoading } = useClaims(undefined, statusFilter)
  const { data: claimTypes = [] } = useClaimTypes()
  const { data: employees = [] } = useEmployees('ACTIVE')
  const approveClaim = useApproveClaim()
  const rejectClaim = useRejectClaim()
  const createClaim = useCreateClaim()

  // New claim form state
  const [showModal, setShowModal] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [claimDate, setClaimDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<ClaimLine[]>([emptyLine()])
  const [error, setError] = useState('')

  // Reject modal state
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Detail view state
  const [viewingClaim, setViewingClaim] = useState<any | null>(null)

  // Action error
  const [actionError, setActionError] = useState('')

  // Stats
  const counts = useMemo(() => ({
    total: claims.length,
    pending: claims.filter((c: any) => c.status === 'PENDING').length,
    approved: claims.filter((c: any) => c.status === 'APPROVED').length,
    totalAmountSen: claims.reduce((sum: number, c: any) => sum + Number(c.total_amount_sen || 0), 0),
  }), [claims])

  // Line items total
  const lineTotal = useMemo(() => {
    return lines.reduce((sum, line) => {
      const val = parseFloat(line.amount)
      return sum + (isNaN(val) ? 0 : val)
    }, 0)
  }, [lines])

  // Line item helpers
  const updateLine = (index: number, field: keyof ClaimLine, value: string) => {
    setLines((prev) => prev.map((l, i) => i === index ? { ...l, [field]: value } : l))
  }

  const addLine = () => {
    setLines((prev) => [...prev, emptyLine()])
  }

  const removeLine = (index: number) => {
    if (lines.length <= 1) return
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const resetForm = () => {
    setEmployeeId('')
    setClaimDate('')
    setNotes('')
    setLines([emptyLine()])
    setError('')
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!employeeId || !claimDate) {
      setError('Please select an employee and claim date')
      return
    }

    const validLines = lines.filter((l) => l.claimTypeId && l.description && l.amount && l.date)
    if (validLines.length === 0) {
      setError('Please add at least one complete line item')
      return
    }

    const hasInvalidAmount = validLines.some((l) => isNaN(parseFloat(l.amount)) || parseFloat(l.amount) <= 0)
    if (hasInvalidAmount) {
      setError('All line item amounts must be positive numbers')
      return
    }

    try {
      await createClaim.mutateAsync({
        employeeId,
        claimDate,
        notes: notes || undefined,
        lines: validLines.map((l) => ({
          claimTypeId: l.claimTypeId,
          description: l.description,
          amountSen: Math.round(parseFloat(l.amount) * 100),
          date: l.date,
        })),
      })
      setShowModal(false)
      resetForm()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to create claim')
    }
  }

  const handleApprove = async (id: string) => {
    setActionError('')
    try {
      await approveClaim.mutateAsync(id)
    } catch (err: any) {
      setActionError(err.response?.data?.message ?? 'Failed to approve claim')
    }
  }

  const handleRejectOpen = (id: string) => {
    setRejectingId(id)
    setRejectReason('')
    setActionError('')
  }

  const handleRejectConfirm = async () => {
    if (!rejectingId) return
    setActionError('')
    try {
      await rejectClaim.mutateAsync({ id: rejectingId, reason: rejectReason || undefined })
      setRejectingId(null)
      setRejectReason('')
    } catch (err: any) {
      setActionError(err.response?.data?.message ?? 'Failed to reject claim')
      setRejectingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Claims & Reimbursements</h1>
          <p className="text-gray-500 text-sm mt-1">Submit and manage employee expense claims</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors"
        >
          + New Claim
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Claims', value: counts.total, color: 'text-gray-800' },
          { label: 'Pending', value: counts.pending, color: 'text-yellow-600' },
          { label: 'Approved', value: counts.approved, color: 'text-green-600' },
          { label: 'Total Amount (RM)', value: formatRinggit(counts.totalAmountSen), color: 'text-sky-600', isString: true },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-semibold mt-0.5 ${s.color}`}>
              {(s as any).isString ? s.value : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Claims Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Status filter tabs */}
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">Claims</h2>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { label: 'All', value: undefined },
              { label: 'Pending', value: 'PENDING' },
              { label: 'Approved', value: 'APPROVED' },
              { label: 'Rejected', value: 'REJECTED' },
              { label: 'Paid', value: 'PAID' },
            ].map((tab) => (
              <button
                key={tab.label}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action error banner */}
        {actionError && (
          <div className="mx-5 mt-3 flex items-center justify-between bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-lg">
            <span>{actionError}</span>
            <button onClick={() => setActionError('')} className="text-red-400 hover:text-red-600 ml-3 text-lg leading-none">&times;</button>
          </div>
        )}

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Claim No</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Employee</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Date</th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Total (RM)</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {claims.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      <p className="text-2xl mb-2">receipt</p>
                      <p className="text-sm">No claims {statusFilter ? `with status "${statusFilter}"` : 'yet'}</p>
                      <p className="text-xs mt-1">Click &quot;+ New Claim&quot; to submit an expense claim</p>
                    </td>
                  </tr>
                ) : (
                  claims.map((claim: any) => (
                    <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-800">{claim.claim_no}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-800">{claim.employee_name}</p>
                        <p className="text-xs text-gray-400">{claim.employee_no}</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {formatDate(claim.claim_date)}
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-800 text-right">
                        {formatRinggit(Number(claim.total_amount_sen || 0))}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[claim.status] || 'bg-gray-100 text-gray-600'}`}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {claim.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprove(claim.id)}
                                disabled={approveClaim.isPending}
                                className="text-xs font-medium text-green-600 hover:text-green-800 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectOpen(claim.id)}
                                disabled={rejectClaim.isPending}
                                className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setViewingClaim(claim)}
                            className="text-xs font-medium text-sky-600 hover:text-sky-800"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Claim Modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Reject Claim</h2>
              <button onClick={() => setRejectingId(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for rejection</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Enter reason for rejecting this claim..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectConfirm}
                  disabled={rejectClaim.isPending}
                  className="flex-1 bg-red-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {rejectClaim.isPending ? 'Rejecting...' : 'Reject Claim'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Claim Detail Modal */}
      {viewingClaim && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Claim Details</h2>
                <p className="text-sm text-gray-500">{viewingClaim.claim_no}</p>
              </div>
              <button onClick={() => setViewingClaim(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Employee</p>
                  <p className="text-sm font-medium text-gray-800">{viewingClaim.employee_name}</p>
                  <p className="text-xs text-gray-400">{viewingClaim.employee_no}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Claim Date</p>
                  <p className="text-sm font-medium text-gray-800">{formatDate(viewingClaim.claim_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[viewingClaim.status] || 'bg-gray-100 text-gray-600'}`}>
                    {viewingClaim.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Amount</p>
                  <p className="text-sm font-semibold text-gray-800">{formatRinggit(Number(viewingClaim.total_amount_sen || 0))}</p>
                </div>
              </div>

              {viewingClaim.notes && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{viewingClaim.notes}</p>
                </div>
              )}

              {viewingClaim.reject_reason && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{viewingClaim.reject_reason}</p>
                </div>
              )}

              {/* Claim lines */}
              {viewingClaim.lines && viewingClaim.lines.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Line Items</p>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left text-xs font-medium text-gray-400 px-3 py-2">Type</th>
                          <th className="text-left text-xs font-medium text-gray-400 px-3 py-2">Description</th>
                          <th className="text-left text-xs font-medium text-gray-400 px-3 py-2">Date</th>
                          <th className="text-right text-xs font-medium text-gray-400 px-3 py-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {viewingClaim.lines.map((line: any, i: number) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-xs text-gray-700">{line.claim_type_name || line.claimTypeId}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{line.description}</td>
                            <td className="px-3 py-2 text-xs text-gray-600">{formatDate(line.date || line.expense_date)}</td>
                            <td className="px-3 py-2 text-xs text-gray-800 font-medium text-right">{formatRinggit(Number(line.amount_sen || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={() => setViewingClaim(null)}
                  className="w-full border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Claim Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">New Claim</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-lg">{error}</div>
              )}

              {/* Employee & Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee <span className="text-red-400">*</span></label>
                  <select
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select employee...</option>
                    {(employees as any[]).map((emp: any) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_no})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Claim Date <span className="text-red-400">*</span></label>
                  <input
                    type="date"
                    value={claimDate}
                    onChange={(e) => setClaimDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Line Items <span className="text-red-400">*</span></label>
                  <button
                    type="button"
                    onClick={addLine}
                    className="text-xs font-medium text-sky-600 hover:text-sky-800"
                  >
                    + Add Line
                  </button>
                </div>
                <div className="space-y-3">
                  {lines.map((line, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">Item {index + 1}</span>
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="text-xs font-medium text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Claim Type</label>
                          <select
                            value={line.claimTypeId}
                            onChange={(e) => updateLine(index, 'claimTypeId', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                          >
                            <option value="">Select type...</option>
                            {(claimTypes as any[]).map((ct: any) => (
                              <option key={ct.id} value={ct.id}>
                                {ct.name} ({ct.code})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Expense Date</label>
                          <input
                            type="date"
                            value={line.date}
                            onChange={(e) => updateLine(index, 'date', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Description</label>
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => updateLine(index, 'description', e.target.value)}
                            placeholder="e.g. Taxi to client office"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Amount (RM)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.amount}
                            onChange={(e) => updateLine(index, 'amount', e.target.value)}
                            placeholder="0.00"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="bg-sky-50 border border-sky-100 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-sky-700">Total</span>
                <span className="text-lg font-bold text-sky-700">RM {lineTotal.toFixed(2)}</span>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes for this claim..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
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
                  disabled={createClaim.isPending}
                  className="flex-1 bg-sky-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-sky-700 transition-colors disabled:opacity-50"
                >
                  {createClaim.isPending ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
