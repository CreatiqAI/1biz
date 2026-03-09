'use client'
import { useAdminStats, useAdminTenants, useToggleTenantActive } from '@/hooks/use-admin'

export default function AdminPage() {
  const { data: stats, isLoading: statsLoading } = useAdminStats()
  const { data: tenants, isLoading: tenantsLoading } = useAdminTenants()
  const toggleActive = useToggleTenantActive()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Platform Admin</h1>
        <p className="text-gray-500 text-sm mt-1">Manage all tenants and platform-wide settings</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Companies"
          value={stats?.tenantCount}
          loading={statsLoading}
          color="bg-brand-50 text-brand-700"
        />
        <StatCard
          label="Total Users"
          value={stats?.userCount}
          loading={statsLoading}
          color="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          label="Plan Distribution"
          value={stats?.planDistribution.map((p) => `${p.plan}: ${p.count}`).join(', ')}
          loading={statsLoading}
          color="bg-violet-50 text-violet-700"
        />
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">All Companies</h2>
        </div>
        {tenantsLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading tenants...</div>
        ) : !tenants?.length ? (
          <div className="p-8 text-center text-sm text-gray-400">No tenants found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Schema</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium text-center">Users</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{t.settings?.companyName || t.name}</p>
                      <p className="text-xs text-gray-400">{t.slug}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-500 font-mono text-xs">{t.schema}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700">
                        {t.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center text-gray-600">{t._count.users}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${t.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {t.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {new Date(t.createdAt).toLocaleDateString('en-MY')}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => toggleActive.mutate(t.id)}
                        disabled={toggleActive.isPending}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          t.isActive
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        } disabled:opacity-50`}
                      >
                        {t.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  loading,
  color,
}: {
  label: string
  value?: string | number
  loading: boolean
  color: string
}) {
  return (
    <div className={`rounded-xl p-5 ${color}`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      {loading ? (
        <div className="h-8 w-16 bg-current opacity-10 rounded mt-1 animate-pulse" />
      ) : (
        <p className="text-2xl font-bold mt-1">{value ?? '—'}</p>
      )}
    </div>
  )
}
