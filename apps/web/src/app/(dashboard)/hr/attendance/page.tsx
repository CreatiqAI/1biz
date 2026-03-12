'use client'
import { useState } from 'react'
import {
  useEmployees,
  useMonthlyWorkEntries,
  useUpsertWorkEntry,
  useDeleteWorkEntry,
  useAllAttendanceSummaries,
} from '@/hooks/use-hr'
import { formatDate } from '@/lib/utils'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type Tab = 'entries' | 'summary'

const defaultForm = {
  employeeId: '',
  date: '',
  normalHours: 8,
  overtimeHours: 0,
  restDayHours: 0,
  phHours: 0,
  isAbsent: false,
  isLate: false,
  notes: '',
}

export default function AttendancePage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [tab, setTab] = useState<Tab>('entries')
  const [form, setForm] = useState({ ...defaultForm })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const { data: employees = [] } = useEmployees('ACTIVE')
  const { data: entries = [], isLoading: entriesLoading } = useMonthlyWorkEntries(year, month)
  const { data: summaries = [], isLoading: summariesLoading } = useAllAttendanceSummaries(year, month)
  const upsertEntry = useUpsertWorkEntry()
  const deleteEntry = useDeleteWorkEntry()

  const empMap = new Map((employees as any[]).map((e: any) => [e.id, e]))

  const resetForm = () => {
    setForm({ ...defaultForm })
    setEditingId(null)
    setError('')
  }

  const openForm = () => {
    resetForm()
    setShowForm(true)
  }

  const handleEdit = (entry: any) => {
    setForm({
      employeeId: entry.employee_id,
      date: entry.date?.slice(0, 10) ?? '',
      normalHours: Number(entry.normal_hours ?? 8),
      overtimeHours: Number(entry.overtime_hours ?? 0),
      restDayHours: Number(entry.rest_day_hours ?? 0),
      phHours: Number(entry.ph_hours ?? 0),
      isAbsent: !!entry.is_absent,
      isLate: !!entry.is_late,
      notes: entry.notes ?? '',
    })
    setEditingId(entry.id)
    setShowForm(true)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.employeeId || !form.date) {
      setError('Employee and date are required')
      return
    }
    try {
      await upsertEntry.mutateAsync({
        employeeId: form.employeeId,
        date: form.date,
        normalHours: form.normalHours,
        overtimeHours: form.overtimeHours,
        restDayHours: form.restDayHours,
        phHours: form.phHours,
        isAbsent: form.isAbsent,
        isLate: form.isLate,
        notes: form.notes || undefined,
      })
      resetForm()
      setShowForm(false)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to save work entry')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteEntry.mutateAsync(id)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to delete entry')
    }
  }

  const formatMyr = (sen: number) => {
    const rm = sen / 100
    return `RM ${rm.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
  }

  const yearOptions = [year - 1, year, year + 1]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Attendance &amp; Work Entries</h1>
          <p className="text-gray-500 text-sm mt-1">Manual entry of daily work hours and overtime</p>
        </div>
        <button
          onClick={openForm}
          className="bg-sky-600 hover:bg-sky-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          + Add Entry
        </button>
      </div>

      {/* Month / Year Selectors */}
      <div className="flex items-center gap-3">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200">
        {([
          { key: 'entries' as Tab, label: 'Daily Entries' },
          { key: 'summary' as Tab, label: 'Monthly Summary' },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-3 text-sm transition-colors ${
              tab === t.key
                ? 'border-b-2 border-sky-600 text-sky-700 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-lg">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 ml-3 text-lg leading-none">&times;</button>
        </div>
      )}

      {/* ═══════════════════ Daily Entries Tab ═══════════════════ */}
      {tab === 'entries' && (
        <>
          {/* Add / Edit Form */}
          {showForm && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">
                {editingId ? 'Edit Work Entry' : 'Add Work Entry'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Employee */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employee <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={form.employeeId}
                      onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
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

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Normal Hours */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Normal Hours</label>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      value={form.normalHours}
                      onChange={(e) => setForm((f) => ({ ...f, normalHours: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* OT Hours */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">OT Hours</label>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      value={form.overtimeHours}
                      onChange={(e) => setForm((f) => ({ ...f, overtimeHours: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  {/* Rest Day Hours */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rest Day Hours</label>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      value={form.restDayHours}
                      onChange={(e) => setForm((f) => ({ ...f, restDayHours: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  {/* PH Hours */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PH Hours</label>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      value={form.phHours}
                      onChange={(e) => setForm((f) => ({ ...f, phHours: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <input
                      type="text"
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Optional"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isAbsent}
                      onChange={(e) => setForm((f) => ({ ...f, isAbsent: e.target.checked }))}
                      className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                    />
                    Absent
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isLate}
                      onChange={(e) => setForm((f) => ({ ...f, isLate: e.target.checked }))}
                      className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                    />
                    Late
                  </label>
                </div>

                {/* Form actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={upsertEntry.isPending}
                    className="bg-sky-600 hover:bg-sky-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {upsertEntry.isPending
                      ? 'Saving...'
                      : editingId ? 'Update Entry' : 'Add Entry'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { resetForm(); setShowForm(false) }}
                    className="text-sm text-gray-500 px-4 py-2 hover:text-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Entries Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-sm font-medium text-gray-700">
                Work Entries for {MONTHS[month - 1]} {year}
              </h2>
            </div>

            {entriesLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (entries as any[]).length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-2xl mb-2">-- --</p>
                <p className="text-sm">No work entries for {MONTHS[month - 1]} {year}</p>
                <p className="text-xs mt-1">Click &quot;+ Add Entry&quot; to start recording attendance</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Employee</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Date</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Normal Hrs</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">OT Hrs</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Rest Day Hrs</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">PH Hrs</th>
                      <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Absent</th>
                      <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Late</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(entries as any[]).map((entry: any) => {
                      const emp = empMap.get(entry.employee_id)
                      return (
                        <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3">
                            <p className="text-sm font-medium text-gray-800">
                              {emp?.full_name ?? entry.employee_name ?? 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {emp?.employee_no ?? entry.employee_no ?? ''}
                            </p>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-600">
                            {formatDate(entry.date)}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-700 text-right">
                            {Number(entry.normal_hours ?? 0)}
                          </td>
                          <td className="px-6 py-3 text-sm text-right">
                            <span className={Number(entry.overtime_hours ?? 0) > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}>
                              {Number(entry.overtime_hours ?? 0)}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm text-right">
                            <span className={Number(entry.rest_day_hours ?? 0) > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                              {Number(entry.rest_day_hours ?? 0)}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm text-right">
                            <span className={Number(entry.ph_hours ?? 0) > 0 ? 'text-purple-600 font-medium' : 'text-gray-400'}>
                              {Number(entry.ph_hours ?? 0)}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            {entry.is_absent ? (
                              <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-600">Yes</span>
                            ) : (
                              <span className="text-xs text-gray-400">No</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-center">
                            {entry.is_late ? (
                              <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-600">Yes</span>
                            ) : (
                              <span className="text-xs text-gray-400">No</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(entry)}
                                className="text-xs font-medium text-sky-600 hover:text-sky-800 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                disabled={deleteEntry.isPending}
                                className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════ Monthly Summary Tab ═══════════════════ */}
      {tab === 'summary' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-700">
              Monthly Summary for {MONTHS[month - 1]} {year}
            </h2>
          </div>

          {summariesLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (summaries as any[]).length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-2xl mb-2">-- --</p>
              <p className="text-sm">No attendance data for {MONTHS[month - 1]} {year}</p>
              <p className="text-xs mt-1">Add work entries in the Daily Entries tab first</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Employee</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Days Worked</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Absences</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Lates</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">OT Hours</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Rest Day Hrs</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">PH Hrs</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">OT Pay (RM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(summaries as any[]).map((s: any) => {
                    const emp = empMap.get(s.employee_id)
                    return (
                      <tr key={s.employee_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3">
                          <p className="text-sm font-medium text-gray-800">
                            {emp?.full_name ?? s.employee_name ?? 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {emp?.employee_no ?? s.employee_no ?? ''}
                          </p>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-700 text-right font-medium">
                          {Number(s.days_worked ?? 0)}
                        </td>
                        <td className="px-6 py-3 text-sm text-right">
                          <span className={Number(s.absences ?? 0) > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                            {Number(s.absences ?? 0)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-right">
                          <span className={Number(s.lates ?? 0) > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}>
                            {Number(s.lates ?? 0)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-right">
                          <span className={Number(s.total_overtime_hours ?? 0) > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}>
                            {Number(s.total_overtime_hours ?? 0)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-right">
                          <span className={Number(s.total_rest_day_hours ?? 0) > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                            {Number(s.total_rest_day_hours ?? 0)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-right">
                          <span className={Number(s.total_ph_hours ?? 0) > 0 ? 'text-purple-600 font-medium' : 'text-gray-400'}>
                            {Number(s.total_ph_hours ?? 0)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-right font-semibold text-green-700">
                          {formatMyr(Number(s.overtime_pay_sen ?? 0))}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
