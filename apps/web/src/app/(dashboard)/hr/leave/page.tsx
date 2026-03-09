'use client'
import { useState, useMemo } from 'react'
import {
  useLeaveRequests, useLeaveTypes, useApproveLeave, useRejectLeave,
  useCreateLeaveRequest, useEmployees,
} from '@/hooks/use-hr'
import { formatDate } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

function calcBusinessDays(start: string, end: string) {
  if (!start || !end) return 0
  const s = new Date(start)
  const e = new Date(end)
  if (e < s) return 0
  let count = 0
  const d = new Date(s)
  while (d <= e) {
    const day = d.getDay()
    if (day !== 0 && day !== 6) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

export default function LeavePage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [showModal, setShowModal] = useState(false)
  const { data: requests = [], isLoading } = useLeaveRequests(undefined, statusFilter)
  const { data: leaveTypes = [] } = useLeaveTypes()
  const { data: employees = [] } = useEmployees('ACTIVE')
  const approveLeave = useApproveLeave()
  const rejectLeave = useRejectLeave()
  const createLeave = useCreateLeaveRequest()

  // Form state
  const [employeeId, setEmployeeId] = useState('')
  const [leaveTypeId, setLeaveTypeId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  // Action state (replaces alert/prompt)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionError, setActionError] = useState('')

  const days = useMemo(() => calcBusinessDays(startDate, endDate), [startDate, endDate])

  const counts = {
    total: requests.length,
    PENDING: requests.filter((r: any) => r.status === 'PENDING').length,
    APPROVED: requests.filter((r: any) => r.status === 'APPROVED').length,
    REJECTED: requests.filter((r: any) => r.status === 'REJECTED').length,
  }

  const handleApprove = async (id: string) => {
    setActionError('')
    try {
      await approveLeave.mutateAsync(id)
    } catch (err: any) {
      setActionError(err.response?.data?.message ?? 'Failed to approve leave request')
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
      await rejectLeave.mutateAsync({ id: rejectingId, reason: rejectReason })
      setRejectingId(null)
      setRejectReason('')
    } catch (err: any) {
      setActionError(err.response?.data?.message ?? 'Failed to reject leave request')
      setRejectingId(null)
    }
  }

  const resetForm = () => {
    setEmployeeId('')
    setLeaveTypeId('')
    setStartDate('')
    setEndDate('')
    setReason('')
    setError('')
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!employeeId || !leaveTypeId || !startDate || !endDate) {
      setError('Please fill in all required fields')
      return
    }
    if (days <= 0) {
      setError('End date must be after start date')
      return
    }
    try {
      await createLeave.mutateAsync({ employeeId, leaveTypeId, startDate, endDate, days, reason: reason || undefined })
      setShowModal(false)
      resetForm()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to create leave request')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Leave Management</h1>
          <p className="text-gray-500 text-sm mt-1">Review and approve employee leave requests</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          + New Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Requests', value: counts.total, color: 'text-gray-800' },
          { label: 'Pending', value: counts.PENDING, color: 'text-amber-600' },
          { label: 'Approved', value: counts.APPROVED, color: 'text-green-600' },
          { label: 'Rejected', value: counts.REJECTED, color: 'text-red-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-semibold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Requests table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700">Leave Requests</h2>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {[
                { label: 'All', value: undefined },
                { label: 'Pending', value: 'PENDING' },
                { label: 'Approved', value: 'APPROVED' },
                { label: 'Rejected', value: 'REJECTED' },
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
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Employee</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Period</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Days</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      <p className="text-2xl mb-2">📅</p>
                      <p className="text-sm">No leave requests {statusFilter ? `with status "${statusFilter}"` : 'yet'}</p>
                    </td>
                  </tr>
                ) : (
                  requests.map((req: any) => (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-800">{req.employee_name}</p>
                        <p className="text-xs text-gray-400">{req.employee_no}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm text-gray-700">{req.leave_type_name}</p>
                        <span className="text-xs text-gray-400">{req.leave_type_code}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {formatDate(req.start_date)} – {formatDate(req.end_date)}
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-800">{Number(req.days)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[req.status]}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {req.status === 'PENDING' && (
                          <div className="flex gap-2">
                            <button onClick={() => handleApprove(req.id)} disabled={approveLeave.isPending} className="text-xs font-medium text-green-600 hover:text-green-800 disabled:opacity-50">
                              Approve
                            </button>
                            <button onClick={() => handleRejectOpen(req.id)} disabled={rejectLeave.isPending} className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50">
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Leave Types sidebar */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Leave Entitlements</h2>
          <p className="text-xs text-gray-400 mb-4">Malaysian Employment Act 1955 defaults</p>
          <div className="space-y-2">
            {leaveTypes.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-4">Loading...</div>
            ) : (
              leaveTypes.map((lt: any) => (
                <div key={lt.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-medium text-gray-700">{lt.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-gray-400">{lt.code}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${lt.is_paid ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        {lt.is_paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">
                    {Number(lt.days_per_year) > 0 ? `${lt.days_per_year}d` : '—'}
                  </span>
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-gray-400 mt-3">Entitlement may vary based on years of service per EA 1955.</p>
        </div>
      </div>

      {/* Reject Leave Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Reject Leave Request</h2>
              <button onClick={() => setRejectingId(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for rejection (optional)</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Enter reason..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
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
                  disabled={rejectLeave.isPending}
                  className="flex-1 bg-red-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {rejectLeave.isPending ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Leave Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">New Leave Request</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-lg">{error}</div>
              )}

              {/* Employee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee <span className="text-red-400">*</span></label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
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

              {/* Leave Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type <span className="text-red-400">*</span></label>
                <select
                  value={leaveTypeId}
                  onChange={(e) => setLeaveTypeId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                >
                  <option value="">Select leave type...</option>
                  {(leaveTypes as any[]).map((lt: any) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name} ({lt.code}) — {Number(lt.days_per_year) > 0 ? `${lt.days_per_year} days/yr` : 'Unpaid'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date <span className="text-red-400">*</span></label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date <span className="text-red-400">*</span></label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || undefined}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Days indicator */}
              {days > 0 && (
                <div className="bg-brand-50 border border-brand-100 rounded-lg px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm text-brand-700">Working days</span>
                  <span className="text-lg font-bold text-brand-700">{days}</span>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Optional reason for leave..."
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
                  disabled={createLeave.isPending}
                  className="flex-1 bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {createLeave.isPending ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
