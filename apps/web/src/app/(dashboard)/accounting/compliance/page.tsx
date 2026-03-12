'use client'
import { useState } from 'react'
import {
  useComplianceDashboard,
  useComplianceObligations,
  useCompleteComplianceObligation,
  useGenerateMonthlyObligations,
  useGenerateAnnualObligations,
  useTaxCodes,
  useSeedTaxCodes,
} from '@/hooks/use-accounting'
import { formatDate } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  OVERDUE: 'bg-red-100 text-red-700',
  DUE_SOON: 'bg-amber-100 text-amber-700',
  UPCOMING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
}

const TYPE_BADGE: Record<string, string> = {
  EPF: 'bg-purple-100 text-purple-700',
  SOCSO: 'bg-indigo-100 text-indigo-700',
  EIS: 'bg-cyan-100 text-cyan-700',
  PCB: 'bg-pink-100 text-pink-700',
  SST: 'bg-orange-100 text-orange-700',
  CP204: 'bg-teal-100 text-teal-700',
  CP204A: 'bg-teal-100 text-teal-700',
  FORM_E: 'bg-violet-100 text-violet-700',
  ANNUAL_RETURN: 'bg-rose-100 text-rose-700',
  FORM_C: 'bg-amber-100 text-amber-700',
  EA_FORM: 'bg-lime-100 text-lime-700',
}

const MONTHS = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
]

const currentYear = new Date().getFullYear()

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'taxcodes'>('calendar')

  // ── Compliance Calendar state ──
  const [filterYear, setFilterYear] = useState<number | undefined>(currentYear)
  const [filterMonth, setFilterMonth] = useState<number | undefined>(undefined)
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined)

  // Monthly modal
  const [showMonthlyModal, setShowMonthlyModal] = useState(false)
  const [monthlyYear, setMonthlyYear] = useState(currentYear)
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().getMonth() + 1)

  // Annual modal
  const [showAnnualModal, setShowAnnualModal] = useState(false)
  const [annualYear, setAnnualYear] = useState(currentYear)
  const [annualIncorpDate, setAnnualIncorpDate] = useState('')
  const [annualFyeMonth, setAnnualFyeMonth] = useState(12)

  // Error states
  const [monthlyError, setMonthlyError] = useState('')
  const [annualError, setAnnualError] = useState('')
  const [actionError, setActionError] = useState('')

  // ── Hooks ──
  const { data: dashboard, isLoading: dashLoading } = useComplianceDashboard()
  const { data: obligations = [], isLoading: oblLoading } = useComplianceObligations(filterYear, filterMonth, filterStatus)
  const completeObligation = useCompleteComplianceObligation()
  const generateMonthly = useGenerateMonthlyObligations()
  const generateAnnual = useGenerateAnnualObligations()
  const { data: taxCodes = [], isLoading: taxLoading } = useTaxCodes()
  const seedTaxCodes = useSeedTaxCodes()

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500'
  const selectClass = 'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500'

  // ── Handlers ──
  const handleGenerateMonthly = async () => {
    setMonthlyError('')
    try {
      await generateMonthly.mutateAsync({ year: monthlyYear, month: monthlyMonth })
      setShowMonthlyModal(false)
    } catch (err: any) {
      setMonthlyError(err.response?.data?.message ?? 'Failed to generate monthly obligations')
    }
  }

  const handleGenerateAnnual = async () => {
    setAnnualError('')
    if (!annualIncorpDate) {
      setAnnualError('Please enter the incorporation date')
      return
    }
    try {
      await generateAnnual.mutateAsync({ year: annualYear, incorporationDate: annualIncorpDate, fyeMonth: annualFyeMonth })
      setShowAnnualModal(false)
    } catch (err: any) {
      setAnnualError(err.response?.data?.message ?? 'Failed to generate annual obligations')
    }
  }

  const handleMarkComplete = async (id: string) => {
    setActionError('')
    try {
      await completeObligation.mutateAsync(id)
    } catch (err: any) {
      setActionError(err.response?.data?.message ?? 'Failed to mark obligation as complete')
    }
  }

  const handleSeedTaxCodes = async () => {
    try {
      await seedTaxCodes.mutateAsync()
    } catch {
      // silently handled by react-query
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  const isTaxCodeActive = (tc: any) => {
    if (!tc.effective_from) return false
    const from = tc.effective_from.slice(0, 10)
    if (from > today) return false
    if (tc.effective_to && tc.effective_to.slice(0, 10) < today) return false
    return true
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Compliance & Tax</h1>
        <p className="text-gray-500 text-sm mt-1">Malaysian statutory obligations & SST tax codes</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { label: 'Compliance Calendar', value: 'calendar' as const },
          { label: 'Tax Codes', value: 'taxcodes' as const },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════ COMPLIANCE CALENDAR TAB ════════════════ */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {dashLoading ? (
              [...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)
            ) : (
              <>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <p className="text-xs text-gray-500 mb-1">Overdue</p>
                  <p className="text-2xl font-semibold text-red-600">{dashboard?.overdue ?? 0}</p>
                  <p className="text-xs text-red-400 mt-1">Requires immediate action</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <p className="text-xs text-gray-500 mb-1">Due Soon</p>
                  <p className="text-2xl font-semibold text-amber-600">{dashboard?.dueSoon ?? 0}</p>
                  <p className="text-xs text-amber-400 mt-1">Within the next 7 days</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <p className="text-xs text-gray-500 mb-1">Upcoming</p>
                  <p className="text-2xl font-semibold text-blue-600">{dashboard?.upcoming ?? 0}</p>
                  <p className="text-xs text-blue-400 mt-1">Scheduled obligations</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <p className="text-xs text-gray-500 mb-1">Completed</p>
                  <p className="text-2xl font-semibold text-emerald-600">{dashboard?.completed ?? 0}</p>
                  <p className="text-xs text-emerald-400 mt-1">Filed & submitted</p>
                </div>
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => { setMonthlyError(''); setShowMonthlyModal(true) }}
              className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              + Generate Monthly
            </button>
            <button
              onClick={() => { setAnnualError(''); setAnnualIncorpDate(''); setShowAnnualModal(true) }}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              + Generate Annual
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={filterYear ?? ''}
              onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : undefined)}
              className={selectClass}
            >
              <option value="">All Years</option>
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={filterMonth ?? ''}
              onChange={(e) => setFilterMonth(e.target.value ? Number(e.target.value) : undefined)}
              className={selectClass}
            >
              <option value="">All Months</option>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={filterStatus ?? ''}
              onChange={(e) => setFilterStatus(e.target.value || undefined)}
              className={selectClass}
            >
              <option value="">All Statuses</option>
              <option value="OVERDUE">Overdue</option>
              <option value="DUE_SOON">Due Soon</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {/* Action Error Banner */}
          {actionError && (
            <div className="flex items-center justify-between bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-lg">
              <span>{actionError}</span>
              <button onClick={() => setActionError('')} className="text-red-400 hover:text-red-600 ml-3 text-lg leading-none">&times;</button>
            </div>
          )}

          {/* Obligations List */}
          {oblLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : obligations.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 py-16 text-center">
              <p className="text-gray-400 text-sm">No obligations found. Use the buttons above to generate monthly or annual obligations.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {obligations.map((ob: any) => (
                <div key={ob.id} className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TYPE_BADGE[ob.obligation_type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ob.obligation_type}
                      </span>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[ob.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {ob.status?.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">{ob.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Due: {ob.due_date ? formatDate(ob.due_date) : '--'}
                      {ob.period_year && <span className="ml-2">Period: {ob.period_year}{ob.period_month ? `/${String(ob.period_month).padStart(2, '0')}` : ''}</span>}
                    </p>
                    {ob.completed_at && (
                      <p className="text-xs text-emerald-500 mt-0.5">Completed on {formatDate(ob.completed_at)}</p>
                    )}
                  </div>
                  {ob.status !== 'COMPLETED' && (
                    <button
                      onClick={() => handleMarkComplete(ob.id)}
                      disabled={completeObligation.isPending}
                      className="shrink-0 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {completeObligation.isPending ? 'Saving...' : 'Mark Complete'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════ TAX CODES TAB ════════════════ */}
      {activeTab === 'taxcodes' && (
        <div className="space-y-5">
          {/* Seed button */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{taxCodes.length} tax code{taxCodes.length !== 1 ? 's' : ''} configured</p>
            <button
              onClick={handleSeedTaxCodes}
              disabled={seedTaxCodes.isPending}
              className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {seedTaxCodes.isPending ? 'Seeding...' : 'Seed Default SST Codes'}
            </button>
          </div>

          {/* Tax Codes Table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {taxLoading ? (
              <div className="p-8 space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : taxCodes.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-sm">No tax codes configured. Click &quot;Seed Default SST Codes&quot; to load Malaysian SST defaults.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Code</th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Name</th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Tax Type</th>
                      <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Rate (%)</th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Category</th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Effective From</th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Effective To</th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {taxCodes.map((tc: any) => {
                      const active = isTaxCodeActive(tc)
                      return (
                        <tr key={tc.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3">
                            <span className="text-sm font-mono font-medium text-gray-800">{tc.code}</span>
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-700">{tc.name}</td>
                          <td className="px-5 py-3">
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                              {tc.tax_type}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-800 text-right font-medium">
                            {Number(tc.rate).toFixed(2)}
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-600">{tc.category ?? '--'}</td>
                          <td className="px-5 py-3 text-sm text-gray-600">
                            {tc.effective_from ? formatDate(tc.effective_from) : '--'}
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-600">
                            {tc.effective_to ? formatDate(tc.effective_to) : '--'}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                              active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {active ? 'Active' : 'Expired'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════ GENERATE MONTHLY MODAL ════════════════ */}
      {showMonthlyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Generate Monthly Obligations</h2>
              <button onClick={() => setShowMonthlyModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {monthlyError && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-lg">{monthlyError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  value={monthlyYear}
                  onChange={(e) => setMonthlyYear(Number(e.target.value))}
                  className={inputClass}
                >
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select
                  value={monthlyMonth}
                  onChange={(e) => setMonthlyMonth(Number(e.target.value))}
                  className={inputClass}
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMonthlyModal(false)}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerateMonthly}
                  disabled={generateMonthly.isPending}
                  className="flex-1 bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {generateMonthly.isPending ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ GENERATE ANNUAL MODAL ════════════════ */}
      {showAnnualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Generate Annual Obligations</h2>
              <button onClick={() => setShowAnnualModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {annualError && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-lg">{annualError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  value={annualYear}
                  onChange={(e) => setAnnualYear(Number(e.target.value))}
                  className={inputClass}
                >
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Incorporation Date <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  value={annualIncorpDate}
                  onChange={(e) => setAnnualIncorpDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">FYE Month</label>
                <select
                  value={annualFyeMonth}
                  onChange={(e) => setAnnualFyeMonth(Number(e.target.value))}
                  className={inputClass}
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAnnualModal(false)}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerateAnnual}
                  disabled={generateAnnual.isPending}
                  className="flex-1 bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {generateAnnual.isPending ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
