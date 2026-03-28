'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAdminTenants, useToggleTenantActive } from '@/hooks/use-admin'
import { formatDate } from '@/lib/utils'

const PLAN_BADGE: Record<string, string> = {
  STARTER: 'bg-gray-100 text-gray-600',
  GROWTH: 'bg-blue-100 text-blue-700',
  BUSINESS: 'bg-violet-100 text-violet-700',
  ENTERPRISE: 'bg-amber-100 text-amber-700',
}

export default function AdminTenantsPage() {
  const { data: tenants = [], isLoading } = useAdminTenants()
  const toggleActive = useToggleTenantActive()
  const [search, setSearch] = useState('')

  const filtered = tenants.filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q) || t.settings?.companyName?.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">All Tenants</h1>
          <p className="text-gray-500 text-sm mt-1">{tenants.length} companies registered</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 16 16">
          <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search companies..." className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />)}</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                {['Company', 'Schema', 'Plan', 'Pricing', 'Users', 'Modules', 'Status', 'Created', ''].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/70">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{t.settings?.companyName ?? t.name}</p>
                    <p className="text-xs text-gray-400">{t.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{t.schema}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PLAN_BADGE[t.plan] ?? 'bg-gray-100'}`}>{t.plan}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.pricingModel}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{t._count.users}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.modules.filter((m) => m.isActive).length} active</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive.mutate(t.id)}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}
                    >
                      {t.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(t.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/tenants/${t.id}`} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Manage</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
