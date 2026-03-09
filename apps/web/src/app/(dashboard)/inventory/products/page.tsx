'use client'
import { useState } from 'react'
import { useProducts, useCreateProduct, useUpdateProduct } from '@/hooks/use-inventory'
import { formatRinggit } from '@/lib/utils'

const initialForm = {
  name: '', sku: '', barcode: '', description: '',
  type: 'PRODUCT', unitOfMeasure: 'unit',
  costPriceRM: '', sellingPriceRM: '',
  sstType: '', sstRate: '0',
  trackInventory: true, reorderPoint: 0,
}

export default function ProductsPage() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(initialForm)
  const [editError, setEditError] = useState('')

  const { data: products = [], isLoading, error } = useProducts(activeFilter)
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const setEdit = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setEditForm((f) => ({ ...f, [field]: e.target.value }))

  const filtered = products.filter((p: any) => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.includes(q)
  })

  const lowStock = products.filter((p: any) => p.track_inventory && Number(p.total_stock ?? 0) <= Number(p.reorder_point ?? 0) && Number(p.total_stock ?? 0) > 0).length

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    try {
      await createProduct.mutateAsync({
        ...form,
        costPriceSen: form.costPriceRM ? Math.round(parseFloat(form.costPriceRM) * 100) : 0,
        sellingPriceSen: form.sellingPriceRM ? Math.round(parseFloat(form.sellingPriceRM) * 100) : 0,
        sstRate: form.sstRate ? parseFloat(form.sstRate) : 0,
        sstType: form.sstType || undefined,
      } as any)
      setShowForm(false)
      setForm(initialForm)
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Failed to create product')
    }
  }

  const handleEdit = (p: any) => {
    setEditForm({
      name: p.name ?? '',
      sku: p.sku ?? '',
      barcode: p.barcode ?? '',
      description: p.description ?? '',
      type: p.type ?? 'PRODUCT',
      unitOfMeasure: p.unit_of_measure ?? 'unit',
      costPriceRM: p.cost_price_sen ? (Number(p.cost_price_sen) / 100).toFixed(2) : '',
      sellingPriceRM: p.selling_price_sen ? (Number(p.selling_price_sen) / 100).toFixed(2) : '',
      sstType: p.sst_type ?? '',
      sstRate: p.sst_rate != null ? String(p.sst_rate) : '0',
      trackInventory: p.track_inventory ?? true,
      reorderPoint: p.reorder_point ?? 0,
    })
    setEditError('')
    setEditingId(p.id)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    setEditError('')
    try {
      await updateProduct.mutateAsync({
        id: editingId,
        ...editForm,
        costPriceSen: editForm.costPriceRM ? Math.round(parseFloat(editForm.costPriceRM) * 100) : 0,
        sellingPriceSen: editForm.sellingPriceRM ? Math.round(parseFloat(editForm.sellingPriceRM) * 100) : 0,
        sstRate: editForm.sstRate ? parseFloat(editForm.sstRate) : 0,
        sstType: editForm.sstType || undefined,
      })
      setEditingId(null)
      setEditForm(initialForm)
    } catch (err: any) {
      setEditError(err.response?.data?.message ?? 'Failed to update product')
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm mt-1">{products.length} products in catalogue</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          + Add Product
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-brand-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">New Product</h2>
          {formError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Product Name <span className="text-red-500">*</span></label>
              <input className={inputClass} value={form.name} onChange={set('name')} required placeholder="Product name" />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea className={inputClass} value={form.description} onChange={set('description')} placeholder="Product description (optional)" rows={2} />
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <select className={inputClass} value={form.type} onChange={set('type')}>
                <option value="PRODUCT">Product (Physical)</option>
                <option value="SERVICE">Service</option>
                <option value="BUNDLE">Bundle</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>SKU</label>
              <input className={inputClass} value={form.sku} onChange={set('sku')} placeholder="e.g. PROD-001" />
            </div>
            <div>
              <label className={labelClass}>Barcode</label>
              <input className={inputClass} value={form.barcode} onChange={set('barcode')} placeholder="Optional" />
            </div>
            <div>
              <label className={labelClass}>Unit of Measure</label>
              <select className={inputClass} value={form.unitOfMeasure} onChange={set('unitOfMeasure')}>
                {['unit','pcs','kg','g','litre','ml','box','carton','pair','set','metre','cm'].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Cost Price (RM)</label>
              <input type="number" step="0.01" min="0" className={inputClass} value={form.costPriceRM} onChange={set('costPriceRM')} placeholder="0.00" />
            </div>
            <div>
              <label className={labelClass}>Selling Price (RM)</label>
              <input type="number" step="0.01" min="0" className={inputClass} value={form.sellingPriceRM} onChange={set('sellingPriceRM')} placeholder="0.00" />
            </div>
            <div>
              <label className={labelClass}>SST Type</label>
              <select className={inputClass} value={form.sstType} onChange={set('sstType')}>
                <option value="">Not applicable</option>
                <option value="SERVICE">Service Tax (6%)</option>
                <option value="SALES">Sales Tax (5%/10%)</option>
                <option value="EXEMPT">Exempt</option>
              </select>
            </div>
            {form.sstType && form.sstType !== 'EXEMPT' && (
              <div>
                <label className={labelClass}>SST Rate (%)</label>
                <input type="number" step="0.01" min="0" max="20" className={inputClass} value={form.sstRate} onChange={set('sstRate')} />
              </div>
            )}
            <div>
              <label className={labelClass}>Reorder Point (qty)</label>
              <input type="number" min="0" className={inputClass} value={form.reorderPoint} onChange={set('reorderPoint')} />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="create-trackInventory"
                checked={form.trackInventory}
                onChange={(e) => setForm((f) => ({ ...f, trackInventory: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="create-trackInventory" className="text-sm text-gray-700">Track Inventory</label>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createProduct.isPending} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {createProduct.isPending ? 'Saving...' : 'Create Product'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormError('') }} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
          </div>
        </form>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingId(null)}>
          <div className="bg-white rounded-xl border border-brand-200 p-5 space-y-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleUpdate} className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-800">Edit Product</h2>
              {editError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{editError}</p>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className={labelClass}>Product Name <span className="text-red-500">*</span></label>
                  <input className={inputClass} value={editForm.name} onChange={setEdit('name')} required placeholder="Product name" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Description</label>
                  <textarea className={inputClass} value={editForm.description} onChange={setEdit('description')} placeholder="Product description (optional)" rows={2} />
                </div>
                <div>
                  <label className={labelClass}>Type</label>
                  <select className={inputClass} value={editForm.type} onChange={setEdit('type')}>
                    <option value="PRODUCT">Product (Physical)</option>
                    <option value="SERVICE">Service</option>
                    <option value="BUNDLE">Bundle</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>SKU</label>
                  <input className={inputClass} value={editForm.sku} onChange={setEdit('sku')} placeholder="e.g. PROD-001" />
                </div>
                <div>
                  <label className={labelClass}>Barcode</label>
                  <input className={inputClass} value={editForm.barcode} onChange={setEdit('barcode')} placeholder="Optional" />
                </div>
                <div>
                  <label className={labelClass}>Unit of Measure</label>
                  <select className={inputClass} value={editForm.unitOfMeasure} onChange={setEdit('unitOfMeasure')}>
                    {['unit','pcs','kg','g','litre','ml','box','carton','pair','set','metre','cm'].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Cost Price (RM)</label>
                  <input type="number" step="0.01" min="0" className={inputClass} value={editForm.costPriceRM} onChange={setEdit('costPriceRM')} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelClass}>Selling Price (RM)</label>
                  <input type="number" step="0.01" min="0" className={inputClass} value={editForm.sellingPriceRM} onChange={setEdit('sellingPriceRM')} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelClass}>SST Type</label>
                  <select className={inputClass} value={editForm.sstType} onChange={setEdit('sstType')}>
                    <option value="">Not applicable</option>
                    <option value="SERVICE">Service Tax (6%)</option>
                    <option value="SALES">Sales Tax (5%/10%)</option>
                    <option value="EXEMPT">Exempt</option>
                  </select>
                </div>
                {editForm.sstType && editForm.sstType !== 'EXEMPT' && (
                  <div>
                    <label className={labelClass}>SST Rate (%)</label>
                    <input type="number" step="0.01" min="0" max="20" className={inputClass} value={editForm.sstRate} onChange={setEdit('sstRate')} />
                  </div>
                )}
                <div>
                  <label className={labelClass}>Reorder Point (qty)</label>
                  <input type="number" min="0" className={inputClass} value={editForm.reorderPoint} onChange={setEdit('reorderPoint')} />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="edit-trackInventory"
                    checked={editForm.trackInventory}
                    onChange={(e) => setEditForm((f) => ({ ...f, trackInventory: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <label htmlFor="edit-trackInventory" className="text-sm text-gray-700">Track Inventory</label>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={updateProduct.isPending} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                  {updateProduct.isPending ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => { setEditingId(null); setEditError('') }} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Total Products</p>
          <p className="text-xl font-semibold text-gray-900 mt-0.5">{products.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Low Stock</p>
          <p className="text-xl font-semibold text-amber-600 mt-0.5">{lowStock} items</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Active</p>
          <p className="text-xl font-semibold text-green-600 mt-0.5">{products.filter((p: any) => p.is_active).length}</p>
        </div>
      </div>

      {/* Filter + Search */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[{ label: 'All', value: undefined }, { label: 'Active', value: true }, { label: 'Inactive', value: false }].map((tab) => (
            <button key={tab.label} onClick={() => setActiveFilter(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeFilter === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[200px] bg-white border border-gray-200 rounded-lg px-3 py-2">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, SKU or barcode..." className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 text-sm">Failed to load products</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Product</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">SKU</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Type</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Cost</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Sell Price</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <p className="text-3xl mb-2">📦</p>
                    <p className="text-sm">{search ? 'No products match your search' : 'No products yet'}</p>
                  </td>
                </tr>
              ) : (
                filtered.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-800">{p.name}</p>
                      {p.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{p.description}</p>}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-gray-600">{p.sku ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{p.type}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{p.cost_price_sen ? formatRinggit(Number(p.cost_price_sen)) : '—'}</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">{p.selling_price_sen ? formatRinggit(Number(p.selling_price_sen)) : '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => handleEdit(p)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Edit</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
