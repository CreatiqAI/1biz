'use client'
import { useState } from 'react'
import { useWarehouses, useCreateWarehouse, useUpdateWarehouse } from '@/hooks/use-inventory'

const MALAYSIAN_STATES = [
  'Johor','Kedah','Kelantan','Melaka','Negeri Sembilan','Pahang','Perak',
  'Perlis','Pulau Pinang','Sabah','Sarawak','Selangor','Terengganu',
  'W.P. Kuala Lumpur','W.P. Labuan','W.P. Putrajaya',
]

const initialForm = { name: '', code: '', addressLine1: '', city: '', state: '', isDefault: false }

export default function WarehousesPage() {
  const { data: warehouses = [], isLoading, error } = useWarehouses()
  const createWarehouse = useCreateWarehouse()
  const updateWarehouse = useUpdateWarehouse()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [formError, setFormError] = useState('')

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    try {
      await createWarehouse.mutateAsync({ ...form, code: form.code || undefined, addressLine1: form.addressLine1 || undefined, city: form.city || undefined, state: form.state || undefined })
      setShowForm(false)
      setForm(initialForm)
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Failed to create warehouse')
    }
  }

  const handleSetDefault = async (wh: any) => {
    await updateWarehouse.mutateAsync({ id: wh.id, isDefault: true })
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Warehouses</h1>
          <p className="text-gray-500 text-sm mt-1">{warehouses.length} storage location{warehouses.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          + Add Warehouse
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-brand-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">New Warehouse / Location</h2>
          {formError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Name <span className="text-red-500">*</span></label>
              <input className={inputClass} value={form.name} onChange={set('name')} required placeholder="e.g. Main Warehouse" />
            </div>
            <div>
              <label className={labelClass}>Code</label>
              <input className={inputClass} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. WH-01" />
            </div>
            <div>
              <label className={labelClass}>Address</label>
              <input className={inputClass} value={form.addressLine1} onChange={set('addressLine1')} placeholder="Street address" />
            </div>
            <div>
              <label className={labelClass}>City</label>
              <input className={inputClass} value={form.city} onChange={set('city')} placeholder="e.g. Shah Alam" />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <select className={inputClass} value={form.state} onChange={set('state')}>
                <option value="">Select state</option>
                {MALAYSIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="isDefault" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} className="rounded border-gray-300" />
              <label htmlFor="isDefault" className="text-sm text-gray-700">Set as default warehouse</label>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createWarehouse.isPending} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {createWarehouse.isPending ? 'Saving...' : 'Create Warehouse'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormError('') }} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
          </div>
        </form>
      )}

      {/* Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(2)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500 text-sm">Failed to load warehouses</div>
      ) : warehouses.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
          <p className="text-3xl mb-2">🏭</p>
          <p className="text-sm">No warehouses yet — add your first storage location above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((wh: any) => (
            <div key={wh.id} className={`bg-white rounded-xl border p-5 ${wh.is_default ? 'border-brand-300 bg-brand-50' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{wh.name}</p>
                  {wh.code && <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mt-0.5 inline-block">{wh.code}</span>}
                </div>
                {wh.is_default && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">Default</span>
                )}
              </div>
              {(wh.city || wh.state) && (
                <p className="text-xs text-gray-500 mb-1">{[wh.address_line1, wh.city, wh.state].filter(Boolean).join(', ')}</p>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${wh.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {wh.is_active ? 'Active' : 'Inactive'}
                </span>
                {!wh.is_default && (
                  <button onClick={() => handleSetDefault(wh)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                    Set as default
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
        <p className="text-xs font-medium text-brand-800 mb-1">Tip</p>
        <p className="text-xs text-brand-700">Warehouses track stock levels separately per location. A product can have different quantities in each warehouse.</p>
      </div>
    </div>
  )
}
