'use client'
import { useState } from 'react'
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact } from '@/hooks/use-accounting'

const TYPE_BADGE: Record<string, string> = {
  CUSTOMER: 'bg-blue-100 text-blue-700',
  SUPPLIER: 'bg-purple-100 text-purple-700',
  BOTH: 'bg-green-100 text-green-700',
}

const MALAYSIAN_STATES = [
  'Johor','Kedah','Kelantan','Melaka','Negeri Sembilan','Pahang','Perak',
  'Perlis','Pulau Pinang','Sabah','Sarawak','Selangor','Terengganu',
  'W.P. Kuala Lumpur','W.P. Labuan','W.P. Putrajaya',
]

const initialForm = {
  type: 'CUSTOMER' as 'CUSTOMER' | 'SUPPLIER' | 'BOTH',
  name: '', companyName: '', email: '', phone: '',
  regNo: '', taxId: '',
  addressLine1: '', city: '', state: '', postcode: '',
  paymentTerms: 30,
}

export default function ContactsPage() {
  const [typeFilter, setTypeFilter] = useState<'CUSTOMER' | 'SUPPLIER' | 'BOTH' | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [formError, setFormError] = useState('')

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(initialForm)
  const [editError, setEditError] = useState('')

  const { data: contacts = [], isLoading, error } = useContacts(typeFilter)
  const createContact = useCreateContact()
  const updateContact = useUpdateContact()
  const deleteContact = useDeleteContact()

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const setEdit = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setEditForm((f) => ({ ...f, [field]: e.target.value }))

  const filtered = contacts.filter((c: any) => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name?.toLowerCase().includes(q) || c.company_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    try {
      await createContact.mutateAsync(form)
      setShowForm(false)
      setForm(initialForm)
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Failed to create contact')
    }
  }

  const startEditing = (c: any) => {
    setEditingId(c.id)
    setEditError('')
    setEditForm({
      type: c.type ?? 'CUSTOMER',
      name: c.name ?? '',
      companyName: c.company_name ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      regNo: c.reg_no ?? '',
      taxId: c.tax_id ?? '',
      addressLine1: c.address_line1 ?? '',
      city: c.city ?? '',
      state: c.state ?? '',
      postcode: c.postcode ?? '',
      paymentTerms: c.payment_terms ?? 30,
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditError('')
  }

  const handleSave = async () => {
    if (!editingId) return
    setEditError('')
    try {
      await updateContact.mutateAsync({ id: editingId, ...editForm })
      setEditingId(null)
    } catch (err: any) {
      setEditError(err.response?.data?.message ?? 'Failed to update contact')
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'
  const editInputClass = 'border border-gray-200 rounded px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 w-full'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Contacts</h1>
          <p className="text-gray-500 text-sm mt-1">{contacts.length} contacts total</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          + Add Contact
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-brand-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">New Contact</h2>
          {formError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Type <span className="text-red-500">*</span></label>
              <select className={inputClass} value={form.type} onChange={set('type')}>
                <option value="CUSTOMER">Customer</option>
                <option value="SUPPLIER">Supplier</option>
                <option value="BOTH">Both</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Name <span className="text-red-500">*</span></label>
              <input className={inputClass} value={form.name} onChange={set('name')} required placeholder="Contact or person name" />
            </div>
            <div>
              <label className={labelClass}>Company Name</label>
              <input className={inputClass} value={form.companyName} onChange={set('companyName')} placeholder="Business/company name" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" className={inputClass} value={form.email} onChange={set('email')} placeholder="billing@company.com" />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input className={inputClass} value={form.phone} onChange={set('phone')} placeholder="03-XXXX XXXX" />
            </div>
            <div>
              <label className={labelClass}>Company Reg No. (SSM)</label>
              <input className={inputClass} value={form.regNo} onChange={set('regNo')} placeholder="e.g. 202301012345" />
            </div>
            <div>
              <label className={labelClass}>SST / Tax ID</label>
              <input className={inputClass} value={form.taxId} onChange={set('taxId')} placeholder="Optional" />
            </div>
            <div>
              <label className={labelClass}>City</label>
              <input className={inputClass} value={form.city} onChange={set('city')} placeholder="e.g. Kuala Lumpur" />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <select className={inputClass} value={form.state} onChange={set('state')}>
                <option value="">Select state</option>
                {MALAYSIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Payment Terms (days)</label>
              <input type="number" min="0" className={inputClass} value={form.paymentTerms} onChange={set('paymentTerms')} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createContact.isPending} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {createContact.isPending ? 'Saving...' : 'Create Contact'}
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
            { label: 'Customers', value: 'CUSTOMER' as const },
            { label: 'Suppliers', value: 'SUPPLIER' as const },
          ].map((tab) => (
            <button key={tab.label} onClick={() => setTypeFilter(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${typeFilter === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[200px] bg-white border border-gray-200 rounded-lg px-3 py-2">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, company or email..." className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 text-sm">Failed to load contacts</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Name</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Type</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Email</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Phone</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Terms</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400">
                    <p className="text-3xl mb-2">👥</p>
                    <p className="text-sm">{search ? 'No contacts match your search' : 'No contacts yet'}</p>
                  </td>
                </tr>
              ) : (
                filtered.map((c: any) =>
                  editingId === c.id ? (
                    <tr key={c.id} className="bg-brand-50/40">
                      <td className="px-5 py-3">
                        <input className={editInputClass} value={editForm.name} onChange={setEdit('name')} placeholder="Name" />
                        <input className={`${editInputClass} mt-1`} value={editForm.companyName} onChange={setEdit('companyName')} placeholder="Company name" />
                      </td>
                      <td className="px-5 py-3">
                        <select className={editInputClass} value={editForm.type} onChange={setEdit('type')}>
                          <option value="CUSTOMER">Customer</option>
                          <option value="SUPPLIER">Supplier</option>
                          <option value="BOTH">Both</option>
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <input type="email" className={editInputClass} value={editForm.email} onChange={setEdit('email')} placeholder="Email" />
                      </td>
                      <td className="px-5 py-3">
                        <input className={editInputClass} value={editForm.phone} onChange={setEdit('phone')} placeholder="Phone" />
                      </td>
                      <td className="px-5 py-3">
                        <input type="number" min="0" className={`${editInputClass} w-20`} value={editForm.paymentTerms} onChange={setEdit('paymentTerms')} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={handleSave}
                            disabled={updateContact.isPending}
                            className="text-xs bg-brand-600 text-white px-3 py-1 rounded font-medium hover:bg-brand-700 disabled:opacity-50"
                          >
                            {updateContact.isPending ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={cancelEditing}
                            disabled={updateContact.isPending}
                            className="text-xs text-gray-500 hover:text-gray-700 font-medium px-3 py-1"
                          >
                            Cancel
                          </button>
                          {editError && <p className="text-xs text-red-500 mt-1">{editError}</p>}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-800">{c.name}</p>
                        {c.company_name && <p className="text-xs text-gray-400">{c.company_name}</p>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TYPE_BADGE[c.type]}`}>{c.type}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{c.email ?? '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{c.phone ?? '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{c.payment_terms} days</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEditing(c)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Edit</button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete contact "${c.name}"? This cannot be undone.`)) {
                                deleteContact.mutate(c.id)
                              }
                            }}
                            disabled={deleteContact.isPending}
                            className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
