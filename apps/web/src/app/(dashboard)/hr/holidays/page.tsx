'use client'
import { useState } from 'react'
import { useHolidays, useCreateHoliday, useDeleteHoliday, useSeedHolidays } from '@/hooks/use-hr'
import { formatDate } from '@/lib/utils'

export default function HolidaysPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)

  const { data: holidays = [], isLoading, error } = useHolidays(year)
  const createHoliday = useCreateHoliday()
  const deleteHoliday = useDeleteHoliday()
  const seedHolidays = useSeedHolidays()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', date: '', isMandatory: true, state: '' })
  const [formError, setFormError] = useState('')

  // Delete confirmation state
  const [deletingHoliday, setDeletingHoliday] = useState<any | null>(null)
  const [deleteError, setDeleteError] = useState('')

  // Seed confirmation state
  const [showSeedConfirm, setShowSeedConfirm] = useState(false)
  const [seedError, setSeedError] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!form.name || !form.date) {
      setFormError('Name and date are required')
      return
    }
    try {
      await createHoliday.mutateAsync({
        name: form.name,
        date: form.date,
        isMandatory: form.isMandatory,
        state: form.state || undefined,
      })
      setShowForm(false)
      setForm({ name: '', date: '', isMandatory: true, state: '' })
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Failed to create holiday')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingHoliday) return
    setDeleteError('')
    try {
      await deleteHoliday.mutateAsync(deletingHoliday.id)
      setDeletingHoliday(null)
    } catch (err: any) {
      setDeleteError(err.response?.data?.message ?? 'Failed to delete holiday')
      setDeletingHoliday(null)
    }
  }

  const handleSeedConfirm = async () => {
    setSeedError('')
    try {
      await seedHolidays.mutateAsync({ year })
      setShowSeedConfirm(false)
    } catch (err: any) {
      setSeedError(err.response?.data?.message ?? 'Failed to seed holidays')
      setShowSeedConfirm(false)
    }
  }

  const mandatoryCount = holidays.filter((h: any) => h.is_mandatory).length
  const stateCount = holidays.filter((h: any) => h.state).length

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Public Holidays</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage public holidays for payroll and leave calculations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSeedConfirm(true)}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Seed Default Holidays
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            + Add Holiday
          </button>
        </div>
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setYear((y) => y - 1)}
          className="border border-gray-200 text-gray-600 w-9 h-9 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center"
        >
          &lt;
        </button>
        <span className="text-lg font-semibold text-gray-800 min-w-[4rem] text-center">{year}</span>
        <button
          onClick={() => setYear((y) => y + 1)}
          className="border border-gray-200 text-gray-600 w-9 h-9 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center"
        >
          &gt;
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Total Holidays', value: holidays.length, color: 'text-gray-800' },
          { label: 'Mandatory (National)', value: mandatoryCount, color: 'text-red-600' },
          { label: 'State-Specific', value: stateCount, color: 'text-blue-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-semibold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-brand-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">New Public Holiday</h2>
          {formError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Name <span className="text-red-500">*</span></label>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="e.g. Hari Raya Aidilfitri"
              />
            </div>
            <div>
              <label className={labelClass}>Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                className={inputClass}
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className={labelClass}>State (optional)</label>
              <select
                className={inputClass}
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              >
                <option value="">National (all states)</option>
                <option value="Johor">Johor</option>
                <option value="Kedah">Kedah</option>
                <option value="Kelantan">Kelantan</option>
                <option value="Melaka">Melaka</option>
                <option value="Negeri Sembilan">Negeri Sembilan</option>
                <option value="Pahang">Pahang</option>
                <option value="Perak">Perak</option>
                <option value="Perlis">Perlis</option>
                <option value="Pulau Pinang">Pulau Pinang</option>
                <option value="Sabah">Sabah</option>
                <option value="Sarawak">Sarawak</option>
                <option value="Selangor">Selangor</option>
                <option value="Terengganu">Terengganu</option>
                <option value="W.P. Kuala Lumpur">W.P. Kuala Lumpur</option>
                <option value="W.P. Putrajaya">W.P. Putrajaya</option>
                <option value="W.P. Labuan">W.P. Labuan</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={form.isMandatory}
                  onChange={(e) => setForm((f) => ({ ...f, isMandatory: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">Mandatory holiday</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createHoliday.isPending}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {createHoliday.isPending ? 'Saving...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError('') }}
              className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {/* Error banners */}
        {deleteError && (
          <div className="mx-5 mt-3 flex items-center justify-between bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-lg">
            <span>{deleteError}</span>
            <button onClick={() => setDeleteError('')} className="text-red-400 hover:text-red-600 ml-3 text-lg leading-none">&times;</button>
          </div>
        )}
        {seedError && (
          <div className="mx-5 mt-3 flex items-center justify-between bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-lg">
            <span>{seedError}</span>
            <button onClick={() => setSeedError('')} className="text-red-400 hover:text-red-600 ml-3 text-lg leading-none">&times;</button>
          </div>
        )}

        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 text-sm">Failed to load holidays</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Holiday</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Day</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Type</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">State</th>
                <th className="px-5 py-3 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {holidays.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400">
                    <p className="text-3xl mb-2">📅</p>
                    <p className="text-sm">No public holidays for {year}</p>
                    <p className="text-xs mt-1">Add holidays manually or seed Malaysian defaults</p>
                  </td>
                </tr>
              ) : (
                holidays.map((holiday: any) => {
                  const d = new Date(holiday.date)
                  const dayName = d.toLocaleDateString('en-MY', { weekday: 'short' })
                  return (
                    <tr key={holiday.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-800">{holiday.name}</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {formatDate(holiday.date)}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">
                        {dayName}
                      </td>
                      <td className="px-5 py-3">
                        {holiday.is_mandatory ? (
                          <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            Mandatory
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full">
                            Optional
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {holiday.state ? (
                          <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            {holiday.state}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">National</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => { setDeletingHoliday(holiday); setDeleteError('') }}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Tip */}
      <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
        <p className="text-xs font-medium text-brand-800 mb-1">Tip</p>
        <p className="text-xs text-brand-700">
          Public holidays are used in payroll calculations (PH overtime rates), leave balance deductions, and attendance tracking.
          Use &ldquo;Seed Default Holidays&rdquo; to auto-populate the standard Malaysian public holidays for the selected year.
        </p>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingHoliday && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Delete Holiday</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">
                Delete <span className="font-semibold text-gray-800">&ldquo;{deletingHoliday.name}&rdquo;</span> ({formatDate(deletingHoliday.date)})? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingHoliday(null)}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleteHoliday.isPending}
                  className="flex-1 bg-red-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleteHoliday.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seed Confirmation Modal */}
      {showSeedConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Seed Default Holidays</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">
                This will populate the standard Malaysian public holidays for <span className="font-semibold text-gray-800">{year}</span>.
                Existing holidays for this year will not be duplicated.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSeedConfirm(false)}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSeedConfirm}
                  disabled={seedHolidays.isPending}
                  className="flex-1 bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {seedHolidays.isPending ? 'Seeding...' : 'Seed Holidays'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
