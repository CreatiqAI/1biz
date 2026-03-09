'use client'
import { useState } from 'react'
import { useOpportunities, useCreateOpportunity, useUpdateOpportunity } from '@/hooks/use-crm'
import { useContacts } from '@/hooks/use-accounting'
import { formatRinggit, formatDate } from '@/lib/utils'

const STAGES = [
  { key: 'PROSPECTING', label: 'Prospecting', color: 'bg-gray-100 text-gray-600' },
  { key: 'QUALIFICATION', label: 'Qualification', color: 'bg-blue-100 text-blue-700' },
  { key: 'PROPOSAL', label: 'Proposal', color: 'bg-amber-100 text-amber-700' },
  { key: 'NEGOTIATION', label: 'Negotiation', color: 'bg-orange-100 text-orange-700' },
  { key: 'CLOSED_WON', label: 'Won', color: 'bg-green-100 text-green-700' },
  { key: 'CLOSED_LOST', label: 'Lost', color: 'bg-red-100 text-red-600' },
]

const initialForm = {
  name: '', contactId: '', stage: 'PROSPECTING', probability: '50',
  expectedValueRM: '', expectedCloseDate: '', notes: '',
}

export default function OpportunitiesPage() {
  const [stageFilter, setStageFilter] = useState<string | undefined>(undefined)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [formError, setFormError] = useState('')

  const { data: opportunities = [], isLoading, error } = useOpportunities(stageFilter)
  const { data: contacts = [] } = useContacts()
  const createOpp = useCreateOpportunity()
  const updateOpp = useUpdateOpportunity()

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const pipelineValue = (opportunities as any[])
    .filter((o: any) => !['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage))
    .reduce((s: number, o: any) => s + Number(o.expected_value_sen ?? 0), 0)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!form.name) { setFormError('Opportunity name is required'); return }
    try {
      await createOpp.mutateAsync({
        name: form.name,
        contactId: form.contactId || undefined,
        stage: form.stage,
        probability: parseInt(form.probability) || 50,
        expectedValueSen: form.expectedValueRM ? Math.round(parseFloat(form.expectedValueRM) * 100) : 0,
        expectedCloseDate: form.expectedCloseDate || undefined,
        notes: form.notes || undefined,
      })
      setShowForm(false)
      setForm(initialForm)
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Failed to create opportunity')
    }
  }

  const handleStageChange = async (id: string, stage: string) => {
    const probability = { PROSPECTING: 20, QUALIFICATION: 40, PROPOSAL: 60, NEGOTIATION: 80, CLOSED_WON: 100, CLOSED_LOST: 0 }[stage] ?? 50
    await updateOpp.mutateAsync({ id, stage, probability })
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Opportunities</h1>
          <p className="text-gray-500 text-sm mt-1">{(opportunities as any[]).length} total · {formatRinggit(pipelineValue)} in pipeline</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
          + New Opportunity
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-brand-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">New Opportunity</h2>
          {formError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Opportunity Name <span className="text-red-500">*</span></label>
              <input className={inputClass} value={form.name} onChange={set('name')} placeholder="e.g. XYZ Corp — ERP Implementation" required />
            </div>
            <div>
              <label className={labelClass}>Contact</label>
              <select className={inputClass} value={form.contactId} onChange={set('contactId')}>
                <option value="">Select contact...</option>
                {(contacts as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Stage</label>
              <select className={inputClass} value={form.stage} onChange={set('stage')}>
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Probability (%)</label>
              <input type="number" min="0" max="100" className={inputClass} value={form.probability} onChange={set('probability')} />
            </div>
            <div>
              <label className={labelClass}>Expected Value (RM)</label>
              <input type="number" step="0.01" min="0" className={inputClass} value={form.expectedValueRM} onChange={set('expectedValueRM')} placeholder="0.00" />
            </div>
            <div>
              <label className={labelClass}>Expected Close Date</label>
              <input type="date" className={inputClass} value={form.expectedCloseDate} onChange={set('expectedCloseDate')} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Notes</label>
              <textarea rows={2} className={inputClass} value={form.notes} onChange={set('notes')} placeholder="Key requirements, decision makers..." />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createOpp.isPending} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {createOpp.isPending ? 'Saving...' : 'Create Opportunity'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormError('') }} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
          </div>
        </form>
      )}

      {/* Stage filter */}
      <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[{ label: 'All', value: undefined }, ...STAGES.map(s => ({ label: s.label, value: s.key }))].map(tab => (
          <button key={tab.label} onClick={() => setStageFilter(tab.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${stageFilter === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 text-sm">Failed to load opportunities</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Opportunity</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Contact</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Stage</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Probability</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Value</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Close Date</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(opportunities as any[]).length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <p className="text-3xl mb-2">💼</p>
                    <p className="text-sm">No opportunities yet</p>
                  </td>
                </tr>
              ) : (
                (opportunities as any[]).map((opp: any) => {
                  const stageCfg = STAGES.find(s => s.key === opp.stage) ?? STAGES[0]
                  return (
                    <tr key={opp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-800">{opp.name}</p>
                        {opp.lead_name && <p className="text-xs text-gray-400">Lead: {opp.lead_name}</p>}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{opp.contact_name ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stageCfg.color}`}>{stageCfg.label}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[60px]">
                            <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${opp.probability ?? 0}%` }} />
                          </div>
                          <span className="text-xs text-gray-600">{opp.probability ?? 0}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-800">
                        {Number(opp.expected_value_sen) > 0 ? formatRinggit(Number(opp.expected_value_sen)) : '—'}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {opp.expected_close_date ? formatDate(opp.expected_close_date) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <select
                          className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 focus:outline-none"
                          value={opp.stage}
                          onChange={e => handleStageChange(opp.id, e.target.value)}
                        >
                          {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
