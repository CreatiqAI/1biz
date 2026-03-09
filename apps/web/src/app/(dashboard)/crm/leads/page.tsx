'use client'
import { useState } from 'react'
import { useLeads, useCreateLead, useUpdateLead } from '@/hooks/use-crm'
import { formatRinggit } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  NEW: { label: 'New', color: 'bg-blue-100 text-blue-700' },
  CONTACTED: { label: 'Contacted', color: 'bg-amber-100 text-amber-700' },
  QUALIFIED: { label: 'Qualified', color: 'bg-green-100 text-green-700' },
  UNQUALIFIED: { label: 'Unqualified', color: 'bg-gray-100 text-gray-500' },
  CONVERTED: { label: 'Converted', color: 'bg-purple-100 text-purple-700' },
}

const SOURCES = ['REFERRAL', 'WEBSITE', 'SOCIAL_MEDIA', 'WALK_IN', 'COLD_CALL', 'OTHER']

const initialForm = { name: '', company: '', email: '', phone: '', source: '', expectedValueRM: '', notes: '' }

export default function LeadsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')

  const { data: leads = [], isLoading, error } = useLeads(statusFilter)
  const createLead = useCreateLead()
  const updateLead = useUpdateLead()

  const filtered = (leads as any[]).filter((l: any) => {
    if (!search) return true
    const q = search.toLowerCase()
    return l.name?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q)
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!form.name) { setFormError('Name is required'); return }
    try {
      await createLead.mutateAsync({
        ...form,
        expectedValueSen: form.expectedValueRM ? Math.round(parseFloat(form.expectedValueRM) * 100) : 0,
        expectedValueRM: undefined as any,
      } as any)
      setShowForm(false)
      setForm(initialForm)
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Failed to create lead')
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    await updateLead.mutateAsync({ id, status })
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Leads</h1>
          <p className="text-gray-500 text-sm mt-1">{(leads as any[]).length} leads total</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          + New Lead
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-brand-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">New Lead</h2>
          {formError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Name <span className="text-red-500">*</span></label>
              <input className={inputClass} value={form.name} onChange={set('name')} placeholder="Contact name" required />
            </div>
            <div>
              <label className={labelClass}>Company</label>
              <input className={inputClass} value={form.company} onChange={set('company')} placeholder="Company name" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" className={inputClass} value={form.email} onChange={set('email')} placeholder="email@company.com" />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input className={inputClass} value={form.phone} onChange={set('phone')} placeholder="01X-XXXXXXX" />
            </div>
            <div>
              <label className={labelClass}>Source</label>
              <select className={inputClass} value={form.source} onChange={set('source')}>
                <option value="">Unknown</option>
                {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Expected Value (RM)</label>
              <input type="number" step="0.01" min="0" className={inputClass} value={form.expectedValueRM} onChange={set('expectedValueRM')} placeholder="0.00" />
            </div>
            <div className="md:col-span-3">
              <label className={labelClass}>Notes</label>
              <textarea rows={2} className={inputClass} value={form.notes} onChange={set('notes')} placeholder="How they came in, what they need..." />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createLead.isPending} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {createLead.isPending ? 'Saving...' : 'Create Lead'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormError('') }} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { label: 'All', value: undefined },
            { label: 'New', value: 'NEW' },
            { label: 'Contacted', value: 'CONTACTED' },
            { label: 'Qualified', value: 'QUALIFIED' },
          ].map(tab => (
            <button key={tab.label} onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[200px] bg-white border border-gray-200 rounded-lg px-3 py-2">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, company or email..." className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 text-sm">Failed to load leads</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Name</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Company</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Source</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Expected Value</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400">
                    <p className="text-3xl mb-2">🧲</p>
                    <p className="text-sm">{search ? 'No leads match your search' : 'No leads yet — add your first lead above'}</p>
                  </td>
                </tr>
              ) : (
                filtered.map((lead: any) => {
                  const cfg = STATUS_CONFIG[lead.status] ?? { label: lead.status, color: 'bg-gray-100 text-gray-600' }
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-800">{lead.name}</p>
                        {lead.email && <p className="text-xs text-gray-400">{lead.email}</p>}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{lead.company ?? '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">{lead.source?.replace('_', ' ') ?? '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-700">{Number(lead.expected_value_sen) > 0 ? formatRinggit(Number(lead.expected_value_sen)) : '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 focus:outline-none"
                          value={lead.status}
                          onChange={e => handleStatusChange(lead.id, e.target.value)}
                        >
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
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
