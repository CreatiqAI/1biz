'use client'
import { useState } from 'react'
import { useStockMovements, useProducts, useWarehouses, useRecordStockMovement } from '@/hooks/use-inventory'
import { formatDate, formatRinggit } from '@/lib/utils'

const TYPE_CONFIG: Record<string, { label: string; color: string; sign: string }> = {
  RECEIVE: { label: 'Received', color: 'text-green-600', sign: '+' },
  ISSUE: { label: 'Issued', color: 'text-red-500', sign: '-' },
  TRANSFER_OUT: { label: 'Transfer Out', color: 'text-amber-600', sign: '-' },
  TRANSFER_IN: { label: 'Transfer In', color: 'text-blue-600', sign: '+' },
  ADJUSTMENT: { label: 'Adjustment', color: 'text-purple-600', sign: '±' },
  SALE: { label: 'Sale', color: 'text-red-500', sign: '-' },
  RETURN: { label: 'Return', color: 'text-green-600', sign: '+' },
}

const initialForm = { type: 'RECEIVE', productId: '', warehouseId: '', quantity: '', unitCostRM: '', notes: '' }

export default function StockPage() {
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [formError, setFormError] = useState('')

  const { data: movements = [], isLoading, error } = useStockMovements(undefined, typeFilter)
  const { data: products = [] } = useProducts(true)
  const { data: warehouses = [] } = useWarehouses()
  const recordMovement = useRecordStockMovement()

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!form.productId) { setFormError('Please select a product'); return }
    if (!form.warehouseId) { setFormError('Please select a warehouse'); return }
    if (!form.quantity || Number(form.quantity) <= 0) { setFormError('Quantity must be greater than 0'); return }
    try {
      await recordMovement.mutateAsync({
        type: form.type,
        productId: form.productId,
        warehouseId: form.warehouseId,
        quantity: parseFloat(form.quantity),
        unitCostSen: form.unitCostRM ? Math.round(parseFloat(form.unitCostRM) * 100) : undefined,
        notes: form.notes || undefined,
      })
      setShowForm(false)
      setForm(initialForm)
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Failed to record movement')
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Stock Movements</h1>
          <p className="text-gray-500 text-sm mt-1">Track all stock in, out, and adjustments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setForm((f) => ({ ...f, type: 'ADJUSTMENT' })); setShowForm(true) }} className="flex items-center gap-1.5 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Adjust Stock
          </button>
          <button onClick={() => { setForm((f) => ({ ...f, type: 'RECEIVE' })); setShowForm(true) }} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
            + Receive Stock
          </button>
        </div>
      </div>

      {/* Record Movement Form */}
      {showForm && (
        <form onSubmit={handleRecord} className="bg-white rounded-xl border border-brand-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Record Stock Movement</h2>
          {formError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Movement Type <span className="text-red-500">*</span></label>
              <select className={inputClass} value={form.type} onChange={set('type')}>
                <option value="RECEIVE">Receive (Stock In)</option>
                <option value="ISSUE">Issue (Stock Out)</option>
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="TRANSFER_OUT">Transfer Out</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Product <span className="text-red-500">*</span></label>
              <select className={inputClass} value={form.productId} onChange={set('productId')}>
                <option value="">Select product...</option>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Warehouse <span className="text-red-500">*</span></label>
              <select className={inputClass} value={form.warehouseId} onChange={set('warehouseId')}>
                <option value="">Select warehouse...</option>
                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Quantity <span className="text-red-500">*</span></label>
              <input type="number" step="0.001" min="0.001" className={inputClass} value={form.quantity} onChange={set('quantity')} placeholder="e.g. 100" />
            </div>
            {form.type === 'RECEIVE' && (
              <div>
                <label className={labelClass}>Unit Cost (RM)</label>
                <input type="number" step="0.01" min="0" className={inputClass} value={form.unitCostRM} onChange={set('unitCostRM')} placeholder="0.00" />
              </div>
            )}
            <div>
              <label className={labelClass}>Notes</label>
              <input className={inputClass} value={form.notes} onChange={set('notes')} placeholder="PO reference, reason, etc." />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={recordMovement.isPending} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {recordMovement.isPending ? 'Saving...' : 'Record Movement'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormError('') }} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
          </div>
        </form>
      )}

      {/* Type Filter */}
      <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { label: 'All', value: undefined },
          { label: 'Received', value: 'RECEIVE' },
          { label: 'Issued', value: 'ISSUE' },
          { label: 'Adjustments', value: 'ADJUSTMENT' },
        ].map((tab) => (
          <button key={tab.label} onClick={() => setTypeFilter(tab.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${typeFilter === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 text-sm">Failed to load stock movements</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Ref No.</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Product</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Type</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Warehouse</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Qty</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <p className="text-3xl mb-2">🔄</p>
                    <p className="text-sm">No stock movements yet</p>
                    <p className="text-xs mt-1">Click &quot;Receive Stock&quot; to record your first stock-in</p>
                  </td>
                </tr>
              ) : (
                movements.map((m: any) => {
                  const cfg = TYPE_CONFIG[m.type] ?? { label: m.type, color: 'text-gray-600', sign: '' }
                  return (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-sm text-gray-600">{m.date ? formatDate(m.date) : '—'}</td>
                      <td className="px-5 py-3 text-sm font-mono text-gray-700">{m.movement_no}</td>
                      <td className="px-5 py-3 text-sm text-gray-800">{m.product_name ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{m.warehouse_name ?? '—'}</td>
                      <td className={`px-5 py-3 text-sm font-semibold ${cfg.color}`}>
                        {cfg.sign}{Number(m.quantity).toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500 max-w-[150px] truncate">{m.notes ?? '—'}</td>
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
