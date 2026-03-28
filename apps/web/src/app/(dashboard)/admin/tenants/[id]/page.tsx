'use client'
import { use } from 'react'
import Link from 'next/link'
import { useAdminTenantDetail, useUpdateTenantModules, useSwitchPricingModel, useToggleTenantActive } from '@/hooks/use-admin'
import { formatDate } from '@/lib/utils'
import { AppModule } from '@1biz/shared'

const ALL_MODULES = Object.values(AppModule)

const MODULE_INFO: Record<string, { label: string; desc: string; color: string; icon: string }> = {
  ACCOUNTING: { label: 'Accounting', desc: 'Invoices, payments, contacts, reports, banking', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: '💰' },
  INVENTORY: { label: 'Inventory', desc: 'Products, warehouses, stock movements', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: '📦' },
  HR: { label: 'HR', desc: 'Employees, departments, leave, attendance, claims', color: 'bg-sky-100 text-sky-700 border-sky-200', icon: '👥' },
  PAYROLL: { label: 'Payroll', desc: 'Salary processing, EPF, SOCSO, EIS, PCB', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: '🏦' },
  CRM: { label: 'CRM', desc: 'Leads, opportunities, quotations', color: 'bg-violet-100 text-violet-700 border-violet-200', icon: '🎯' },
  POS: { label: 'POS', desc: 'Point of sale, barcode scanning', color: 'bg-pink-100 text-pink-700 border-pink-200', icon: '🛒' },
}

export default function AdminTenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: tenant, isLoading } = useAdminTenantDetail(id)
  const updateModules = useUpdateTenantModules()
  const switchPricing = useSwitchPricingModel()
  const toggleActive = useToggleTenantActive()

  if (isLoading || !tenant) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
  }

  const isModular = tenant.pricingModel === 'MODULAR'
  const effectiveModules = tenant.effectiveModules ?? []

  const handleToggleModule = async (module: string) => {
    const isEnabled = effectiveModules.includes(module)
    await updateModules.mutateAsync({
      tenantId: id,
      modules: [{ module, isActive: !isEnabled }],
    })
  }

  const handleSwitchPricing = async () => {
    await switchPricing.mutateAsync({
      tenantId: id,
      model: isModular ? 'FLAT' : 'MODULAR',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/tenants" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">{(tenant.settings as any)?.companyName ?? tenant.name}</h1>
          <p className="text-gray-500 text-sm">{tenant.slug} &middot; {tenant.schema}</p>
        </div>
        <button
          onClick={() => toggleActive.mutate(id)}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${tenant.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}
        >
          {tenant.isActive ? 'Active' : 'Inactive'}
        </button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Plan</p>
          <p className="text-lg font-semibold text-gray-800 mt-0.5">{tenant.plan}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Pricing Model</p>
          <p className="text-lg font-semibold text-gray-800 mt-0.5">{tenant.pricingModel}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Users</p>
          <p className="text-lg font-semibold text-gray-800 mt-0.5">{tenant.users?.length ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Created</p>
          <p className="text-lg font-semibold text-gray-800 mt-0.5">{formatDate(tenant.createdAt)}</p>
        </div>
      </div>

      {/* Module Toggles */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Modules</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isModular ? 'Modular pricing — toggle individual modules' : `Flat plan (${tenant.plan}) — modules derived from plan`}
            </p>
          </div>
          <button
            onClick={handleSwitchPricing}
            disabled={switchPricing.isPending}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Switch to {isModular ? 'Flat' : 'Modular'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ALL_MODULES.map((mod) => {
            const info = MODULE_INFO[mod]
            const enabled = effectiveModules.includes(mod)
            return (
              <div key={mod} className={`rounded-xl border-2 p-4 transition-all ${enabled ? `${info.color} border-current` : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{info.icon}</span>
                    <div>
                      <p className="text-sm font-semibold">{info.label}</p>
                      <p className="text-[11px] opacity-70 mt-0.5">{info.desc}</p>
                    </div>
                  </div>
                  {isModular ? (
                    <button
                      onClick={() => handleToggleModule(mod)}
                      disabled={updateModules.isPending}
                      className={`w-10 h-5 rounded-full relative transition-colors ${enabled ? 'bg-current opacity-50' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  ) : (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${enabled ? 'bg-white/50' : 'bg-gray-200 text-gray-500'}`}>
                      {enabled ? 'Included' : 'Not in plan'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Users */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">Users ({tenant.users?.length ?? 0})</h2>
        <div className="divide-y divide-gray-50">
          {(tenant.users ?? []).map((tu) => (
            <div key={tu.user.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium text-gray-800">{tu.user.fullName}</p>
                <p className="text-xs text-gray-400">{tu.user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {tu.isOwner && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Owner</span>}
                {tu.roles.map((r) => (
                  <span key={r} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{r}</span>
                ))}
                <span className={`w-2 h-2 rounded-full ${tu.user.isActive ? 'bg-green-400' : 'bg-gray-300'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
