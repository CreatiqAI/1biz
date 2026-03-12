'use client'
import { useState } from 'react'
import { useJournals, useCreateJournal, usePostJournal, useReverseJournal, useDeleteJournal, useAccounts } from '@/hooks/use-accounting'
import { formatRinggit, formatDate } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  POSTED: 'bg-emerald-100 text-emerald-700',
  REVERSED: 'bg-red-100 text-red-600',
}

const SOURCES = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'PAYROLL', label: 'Payroll' },
  { value: 'OTHER', label: 'Other' },
]

interface LineItem {
  accountId: string
  description: string
  debit: string
  credit: string
}

const emptyLine = (): LineItem => ({ accountId: '', description: '', debit: '', credit: '' })

export default function JournalsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [showModal, setShowModal] = useState(false)
  const { data: journals = [], isLoading, error } = useJournals()
  const { data: accounts = [] } = useAccounts()
  const createJournal = useCreateJournal()
  const postJournal = usePostJournal()
  const reverseJournal = useReverseJournal()
  const deleteJournal = useDeleteJournal()

  // Form state
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [source, setSource] = useState('MANUAL')
  const [lines, setLines] = useState<LineItem[]>([emptyLine(), emptyLine()])
  const [formError, setFormError] = useState('')

  const filtered = journals.filter((j: any) => !statusFilter || j.status === statusFilter)

  const resetForm = () => {
    setDate('')
    setDescription('')
    setSource('MANUAL')
    setLines([emptyLine(), emptyLine()])
    setFormError('')
  }

  const updateLine = (index: number, field: keyof LineItem, value: string) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)))
  }

  const addLine = () => {
    setLines((prev) => [...prev, emptyLine()])
  }

  const removeLine = (index: number) => {
    if (lines.length <= 2) return
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const parseSen = (val: string): number => {
    const num = parseFloat(val)
    return isNaN(num) || num < 0 ? 0 : Math.round(num * 100)
  }

  const totalDebitSen = lines.reduce((s, l) => s + parseSen(l.debit), 0)
  const totalCreditSen = lines.reduce((s, l) => s + parseSen(l.credit), 0)
  const isBalanced = totalDebitSen === totalCreditSen && totalDebitSen > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!date || !description.trim()) {
      setFormError('Please fill in date and description')
      return
    }

    const validLines = lines.filter((l) => l.accountId && (parseSen(l.debit) > 0 || parseSen(l.credit) > 0))
    if (validLines.length < 2) {
      setFormError('At least 2 lines with accounts and amounts are required')
      return
    }

    if (!isBalanced) {
      setFormError('Total debits must equal total credits')
      return
    }

    try {
      await createJournal.mutateAsync({
        date,
        description: description.trim(),
        source: source || undefined,
        lines: validLines.map((l) => ({
          accountId: l.accountId,
          description: l.description || undefined,
          debitSen: parseSen(l.debit),
          creditSen: parseSen(l.credit),
        })),
      })
      setShowModal(false)
      resetForm()
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Failed to create journal entry')
    }
  }

  const handlePost = async (id: string) => {
    if (!confirm('Post this journal entry? This action cannot be undone.')) return
    try {
      await postJournal.mutateAsync(id)
    } catch {
      // ignore
    }
  }

  const handleReverse = async (id: string) => {
    if (!confirm('Reverse this journal entry? A reversing entry will be created.')) return
    try {
      await reverseJournal.mutateAsync(id)
    } catch {
      // ignore
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft journal entry?')) return
    try {
      await deleteJournal.mutateAsync(id)
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Journal Entries</h1>
          <p className="text-gray-500 text-sm mt-1">Manual and system-generated journal entries</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          + New Journal
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { label: 'All', value: undefined },
          { label: 'Draft', value: 'DRAFT' },
          { label: 'Posted', value: 'POSTED' },
          { label: 'Reversed', value: 'REVERSED' },
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
          <div className="text-center py-12 text-red-500 text-sm">Failed to load journal entries</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Entry No</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Description</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Source</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Total Debit (RM)</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <p className="text-3xl mb-2">📒</p>
                    <p className="text-sm">No journal entries yet</p>
                  </td>
                </tr>
              ) : (
                filtered.map((j: any) => {
                  const totalDebit = (j.lines ?? []).reduce((s: number, l: any) => s + Number(l.debit_sen ?? 0), 0)
                  return (
                    <tr key={j.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-sm text-gray-600">{j.date ? formatDate(j.date) : '—'}</td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-800">{j.entry_no ?? '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-600 max-w-xs truncate">{j.description ?? '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">{j.source ?? '—'}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-800 text-right">{formatRinggit(totalDebit)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[j.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {j.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {j.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => handlePost(j.id)}
                                disabled={postJournal.isPending}
                                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                              >
                                Post
                              </button>
                              <button
                                onClick={() => handleDelete(j.id)}
                                disabled={deleteJournal.isPending}
                                className="text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </>
                          )}
                          {j.status === 'POSTED' && (
                            <button
                              onClick={() => handleReverse(j.id)}
                              disabled={reverseJournal.isPending}
                              className="text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
                            >
                              Reverse
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Journal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">New Journal Entry</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto">
              {formError && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-lg">{formError}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Monthly depreciation"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Source */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    {SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Line Items</label>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left text-xs font-medium text-gray-500 px-3 py-2">Account</th>
                        <th className="text-left text-xs font-medium text-gray-500 px-3 py-2">Description</th>
                        <th className="text-right text-xs font-medium text-gray-500 px-3 py-2 w-32">Debit (RM)</th>
                        <th className="text-right text-xs font-medium text-gray-500 px-3 py-2 w-32">Credit (RM)</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">
                            <select
                              value={line.accountId}
                              onChange={(e) => updateLine(idx, 'accountId', e.target.value)}
                              className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            >
                              <option value="">Select account...</option>
                              {(accounts as any[]).map((a: any) => (
                                <option key={a.id} value={a.id}>
                                  {a.code} — {a.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) => updateLine(idx, 'description', e.target.value)}
                              placeholder="Optional"
                              className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.debit}
                              onChange={(e) => updateLine(idx, 'debit', e.target.value)}
                              placeholder="0.00"
                              className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.credit}
                              onChange={(e) => updateLine(idx, 'credit', e.target.value)}
                              placeholder="0.00"
                              className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            {lines.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeLine(idx)}
                                className="text-gray-400 hover:text-red-500 text-lg leading-none"
                              >
                                &times;
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200 bg-gray-50">
                        <td colSpan={2} className="px-3 py-2">
                          <button
                            type="button"
                            onClick={addLine}
                            className="text-xs font-medium text-brand-600 hover:text-brand-700"
                          >
                            + Add Line
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-semibold text-gray-800">
                          {formatRinggit(totalDebitSen)}
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-semibold text-gray-800">
                          {formatRinggit(totalCreditSen)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Balance indicator */}
                {totalDebitSen > 0 || totalCreditSen > 0 ? (
                  <div className={`mt-2 text-xs font-medium ${isBalanced ? 'text-emerald-600' : 'text-red-500'}`}>
                    {isBalanced
                      ? 'Debits and credits are balanced'
                      : `Out of balance by ${formatRinggit(Math.abs(totalDebitSen - totalCreditSen))}`}
                  </div>
                ) : null}
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
                  disabled={createJournal.isPending || !isBalanced}
                  className="flex-1 bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {createJournal.isPending ? 'Creating...' : 'Create Journal Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
