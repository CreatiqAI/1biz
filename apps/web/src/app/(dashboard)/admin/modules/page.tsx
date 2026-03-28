'use client'
import { useState } from 'react'
import { useAdminModulePricing, useUpsertModulePricing } from '@/hooks/use-admin'
import { AppModule } from '@1biz/shared'

const ALL_MODULES = Object.values(AppModule)

const MODULE_DEFAULTS: Record<string, { name: string; desc: string; monthly: number; yearly: number; icon: string }> = {
  ACCOUNTING: { name: 'Accounting', desc: 'Invoices, payments, contacts, chart of accounts, reports', monthly: 49, yearly: 490, icon: '💰' },
  INVENTORY: { name: 'Inventory', desc: 'Products, warehouses, stock movements', monthly: 29, yearly: 290, icon: '📦' },
  HR: { name: 'HR', desc: 'Employees, departments, leave, attendance, claims', monthly: 39, yearly: 390, icon: '👥' },
  PAYROLL: { name: 'Payroll', desc: 'Salary processing, EPF/SOCSO/EIS/PCB', monthly: 39, yearly: 390, icon: '🏦' },
  CRM: { name: 'CRM', desc: 'Leads, opportunities, quotations', monthly: 29, yearly: 290, icon: '🎯' },
  POS: { name: 'POS', desc: 'Point of sale, barcode scanning', monthly: 29, yearly: 290, icon: '🛒' },
}

export default function AdminModulesPage() {
  const { data: pricing = [], isLoading } = useAdminModulePricing()
  const upsert = useUpsertModulePricing()
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', monthlyPrice: 0, yearlyPrice: 0 })

  const startEdit = (module: string) => {
    const existing = pricing.find((p) => p.module === module)
    const defaults = MODULE_DEFAULTS[module]
    setForm({
      name: existing?.name ?? defaults?.name ?? module,
      description: existing?.description ?? defaults?.desc ?? '',
      monthlyPrice: existing ? Number(existing.monthlyPrice) : (defaults?.monthly ?? 0),
      yearlyPrice: existing ? Number(existing.yearlyPrice) : (defaults?.yearly ?? 0),
    })
    setEditing(module)
  }

  const handleSave = async () => {
    if (!editing) return
    await upsert.mutateAsync({ module: editing, ...form })
    setEditing(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Module Pricing</h1>
        <p className="text-gray-500 text-sm mt-1">Set prices for each module. Tenants on modular pricing pay per module.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ALL_MODULES.map((mod) => {
            const existing = pricing.find((p) => p.module === mod)
            const defaults = MODULE_DEFAULTS[mod]
            const isEditing = editing === mod

            return (
              <div key={mod} className="bg-white rounded-xl border border-gray-100 p-5">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{defaults?.icon}</span>
                      <h3 className="text-sm font-semibold text-gray-800">{mod}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Name</label>
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Description</label>
                        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Monthly (RM)</label>
                        <input type="number" value={form.monthlyPrice} onChange={(e) => setForm({ ...form, monthlyPrice: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Yearly (RM)</label>
                        <input type="number" value={form.yearlyPrice} onChange={(e) => setForm({ ...form, yearlyPrice: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditing(null)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
                      <button onClick={handleSave} disabled={upsert.isPending} className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50">
                        {upsert.isPending ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{defaults?.icon}</span>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800">{existing?.name ?? defaults?.name ?? mod}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{existing?.description ?? defaults?.desc}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-sm font-semibold text-gray-800">
                            RM {existing ? Number(existing.monthlyPrice).toFixed(0) : defaults?.monthly ?? '—'}<span className="text-xs text-gray-400 font-normal">/mo</span>
                          </span>
                          <span className="text-xs text-gray-400">|</span>
                          <span className="text-sm text-gray-600">
                            RM {existing ? Number(existing.yearlyPrice).toFixed(0) : defaults?.yearly ?? '—'}<span className="text-xs text-gray-400 font-normal">/yr</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {existing && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${existing.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {existing.isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                      {!existing && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Not configured</span>}
                      <button onClick={() => startEdit(mod)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Edit</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
