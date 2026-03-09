'use client'
import { useState } from 'react'
import { useAuditLogs } from '@/hooks/use-audit'

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  INVITE: 'bg-violet-100 text-violet-700',
  TOGGLE: 'bg-amber-100 text-amber-700',
  APPROVE: 'bg-emerald-100 text-emerald-700',
  REJECT: 'bg-red-100 text-red-700',
  GENERATE: 'bg-sky-100 text-sky-700',
  MARK_PAID: 'bg-emerald-100 text-emerald-700',
}

const ENTITY_TYPES = [
  '', 'invoice', 'payment', 'contact', 'account', 'product', 'warehouse',
  'stock_movement', 'lead', 'opportunity', 'quotation', 'employee',
  'department', 'leave_type', 'leave_request', 'payroll', 'user', 'settings', 'tenant',
]

const PAGE_SIZE = 25

export default function AuditLogPage() {
  const [page, setPage] = useState(0)
  const [entityFilter, setEntityFilter] = useState('')
  const { data, isLoading } = useAuditLogs({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    entityType: entityFilter || undefined,
  })

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Audit Log</h1>
        <p className="text-gray-500 text-sm mt-1">Track all changes made by team members</p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-500">Filter by:</label>
        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(0) }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All entities</option>
          {ENTITY_TYPES.filter(Boolean).map((t) => (
            <option key={t} value={t}>{t.replace('_', ' ')}</option>
          ))}
        </select>
        {data && (
          <span className="text-xs text-gray-400 ml-auto">{data.total} total entries</span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-400">Loading audit logs...</div>
        ) : !data?.rows.length ? (
          <div className="p-12 text-center text-sm text-gray-400">No audit entries found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">Timestamp</th>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                  <th className="px-5 py-3 font-medium">Entity</th>
                  <th className="px-5 py-3 font-medium">Details</th>
                  <th className="px-5 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.rows.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString('en-MY', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-gray-800 text-xs font-medium">
                        {entry.user_email === 'AI Assistant' ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="w-4 h-4 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-[9px] font-bold">AI</span>
                            AI Assistant
                          </span>
                        ) : entry.user_email}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        ACTION_COLORS[entry.action] ?? 'bg-gray-100 text-gray-600'
                      }`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-gray-600">{entry.entity_type}</span>
                      {entry.entity_id && (
                        <span className="text-[10px] text-gray-400 ml-1 font-mono">
                          {entry.entity_id.substring(0, 8)}...
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 max-w-xs">
                      {entry.details ? (
                        <details className="text-xs">
                          <summary className="text-gray-400 cursor-pointer hover:text-gray-600">
                            {Object.keys(entry.details).length} field(s)
                          </summary>
                          <pre className="mt-1 text-[10px] text-gray-500 bg-gray-50 rounded p-2 overflow-auto max-h-32">
                            {JSON.stringify(entry.details, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs font-mono">
                      {entry.ip_address || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30"
            >
              Previous
            </button>
            <span className="text-xs text-gray-400">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
