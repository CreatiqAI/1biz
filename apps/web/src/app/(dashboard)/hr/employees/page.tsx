'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useEmployees, useUpdateEmployeeStatus, useDeleteEmployee } from '@/hooks/use-hr'
import { formatRinggit, formatDate, getInitials } from '@/lib/utils'
import { StatusGlyph, STATUS_OPTIONS } from '@/components/ui/status-glyph'

const TYPE_LABEL: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT:  'Contract',
  INTERN:    'Intern',
}

const AVATAR_PALETTES = [
  'bg-violet-100 text-violet-700',
  'bg-brand-100 text-brand-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_PALETTES[Math.abs(h) % AVATAR_PALETTES.length]
}

function TeamIllustration() {
  return (
    <svg viewBox="0 0 220 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-56 mx-auto mb-6">
      <ellipse cx="110" cy="120" rx="80" ry="8" fill="#E0F2FE" opacity=".6" />
      {/* Left person — emerald */}
      <circle cx="55" cy="42" r="18" fill="#D1FAE5" />
      <circle cx="55" cy="42" r="11" fill="#6EE7B7" />
      <circle cx="55" cy="42" r="6"  fill="#10B981" />
      <rect   x="32" y="64" width="46" height="28" rx="9" fill="#D1FAE5" />
      <rect   x="38" y="64" width="34" height="18" rx="7" fill="#6EE7B7" />
      {/* Center — dashed placeholder */}
      <circle cx="110" cy="42" r="18" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="5 3.5" />
      <rect   x="87"  y="64" width="46" height="28" rx="9" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="5 3.5" />
      <circle cx="110" cy="42" r="13" fill="#F8FAFC" />
      <path   d="M110 36v12M104 42h12" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
      {/* Right person — violet */}
      <circle cx="165" cy="42" r="18" fill="#EDE9FE" />
      <circle cx="165" cy="42" r="11" fill="#C4B5FD" />
      <circle cx="165" cy="42" r="6"  fill="#8B5CF6" />
      <rect   x="142" y="64" width="46" height="28" rx="9" fill="#EDE9FE" />
      <rect   x="148" y="64" width="34" height="18" rx="7" fill="#C4B5FD" />
      {/* Sparkles */}
      <circle cx="22"  cy="24"  r="3" fill="#FDE68A" opacity=".8" />
      <circle cx="198" cy="20"  r="2" fill="#A5F3FC" opacity=".9" />
      <circle cx="18"  cy="98"  r="2" fill="#BBF7D0" opacity=".8" />
      <circle cx="202" cy="96"  r="3" fill="#FECDD3" opacity=".8" />
      <circle cx="110" cy="10"  r="2" fill="#FED7AA" opacity=".7" />
    </svg>
  )
}

export default function EmployeesPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: employees = [], isLoading, error } = useEmployees(statusFilter)
  const updateStatus = useUpdateEmployeeStatus()
  const deleteEmployee = useDeleteEmployee()

  const filtered = employees.filter((e) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      e.full_name?.toLowerCase().includes(q) ||
      e.employee_no?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q)
    )
  })

  const counts = {
    all:       employees.length,
    ACTIVE:    employees.filter((e) => e.status === 'ACTIVE').length,
    PROBATION: employees.filter((e) => e.status === 'PROBATION').length,
    RESIGNED:  employees.filter((e) => ['RESIGNED', 'TERMINATED'].includes(e.status)).length,
  }

  const statCards = [
    { label: 'Active',    filterVal: 'ACTIVE' as string | undefined,   count: counts.ACTIVE,    glassFrom: 'from-emerald-50', borderActive: 'border-emerald-400', numColor: 'text-emerald-600', dotBg: 'bg-emerald-400' },
    { label: 'Probation', filterVal: 'PROBATION' as string | undefined, count: counts.PROBATION, glassFrom: 'from-amber-50',   borderActive: 'border-amber-400',   numColor: 'text-amber-600',   dotBg: 'bg-amber-400' },
    { label: 'All Staff', filterVal: undefined,                         count: counts.all,       glassFrom: 'from-brand-50',   borderActive: 'border-brand-400',   numColor: 'text-brand-600',   dotBg: 'bg-brand-400' },
    { label: 'Ex-Staff',  filterVal: 'RESIGNED' as string | undefined,  count: counts.RESIGNED,  glassFrom: 'from-gray-50',    borderActive: 'border-gray-400',    numColor: 'text-gray-500',    dotBg: 'bg-gray-400' },
  ]

  const handleStatusChange = async (id: string, status: string) => {
    await updateStatus.mutateAsync({ id, status })
    setEditingStatusId(null)
  }

  return (
    <div className="space-y-5" onClick={() => setEditingStatusId(null)}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Employees</h1>
          <p className="text-gray-500 text-sm mt-0.5">{employees.length} total · click a card to filter</p>
        </div>
        <Link
          href="/hr/employees/new"
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
        >
          + Add Employee
        </Link>
      </div>

      {/* Bento-glass stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((card) => {
          const isSelected = statusFilter === card.filterVal
          return (
            <button
              key={card.label}
              onClick={(e) => { e.stopPropagation(); setStatusFilter(isSelected ? undefined : card.filterVal) }}
              className={`relative overflow-hidden text-left rounded-xl border-2 p-4 transition-all duration-200 bg-gradient-to-br ${card.glassFrom} to-white ${
                isSelected ? `${card.borderActive} shadow-card-hover` : 'border-transparent shadow-card hover:border-gray-200'
              }`}
            >
              {/* Glass top highlight */}
              <div className="absolute inset-x-2 top-0 h-px bg-white opacity-80" />
              <div className="flex items-start justify-between mb-1.5">
                <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                {isSelected && <span className={`w-1.5 h-1.5 rounded-full mt-0.5 shrink-0 ${card.dotBg}`} />}
              </div>
              <p className={`text-2xl font-bold tracking-tight ${card.numColor}`}>{card.count}</p>
              {isSelected && <p className="text-[10px] text-gray-400 mt-1">Click to clear</p>}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 flex items-center gap-2 shadow-card">
        <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 16 16">
          <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, ID, or email..."
          className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
        />
        {search && <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500 text-xs">✕</button>}
      </div>

      {/* Table / Empty state */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 text-sm">Failed to load employees</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-10 px-8">
            {!search && <TeamIllustration />}
            {search ? (
              <>
                <p className="text-base font-semibold text-gray-800">No match for &ldquo;{search}&rdquo;</p>
                <p className="text-sm text-gray-400 mt-1">Try a different name, ID, or email</p>
                <button onClick={() => setSearch('')} className="mt-3 text-xs text-brand-600 hover:text-brand-700 font-medium">Clear search</button>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-gray-800">Your team is waiting</p>
                <p className="text-sm text-gray-400 mt-1 text-center max-w-xs">Add your first employee to unlock HR management, payroll, and leave tracking</p>
                <Link
                  href="/hr/employees/new"
                  className="mt-4 inline-flex items-center gap-1.5 bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-700 shadow-sm"
                >
                  + Add First Employee
                </Link>
              </>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                {['Employee', 'ID', 'Department', 'Type', 'Hire Date', 'Salary', 'Status', ''].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((emp) => {
                const avatarCls = avatarColor(emp.full_name ?? 'U')
                return (
                  <tr key={emp.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${avatarCls}`}>
                          {getInitials(emp.full_name ?? '?')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 leading-tight">{emp.full_name}</p>
                          <p className="text-xs text-gray-400 leading-tight">{emp.email ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 font-mono">{emp.employee_no}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{emp.department_name ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{TYPE_LABEL[emp.employment_type] ?? emp.employment_type}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{emp.hire_date ? formatDate(emp.hire_date) : '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-800 font-medium">
                      {emp.basic_salary_sen ? formatRinggit(Number(emp.basic_salary_sen)) : '—'}
                    </td>

                    {/* Inline status glyph + dropdown */}
                    <td className="px-5 py-3 relative">
                      <button
                        title="Click to change status"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingStatusId(editingStatusId === emp.id ? null : emp.id)
                        }}
                        className="cursor-pointer hover:opacity-70 transition-opacity"
                      >
                        <StatusGlyph status={emp.status} />
                      </button>
                      {editingStatusId === emp.id && (
                        <div
                          className="absolute left-4 top-11 z-20 bg-white rounded-xl shadow-float border border-gray-100 py-1.5 min-w-[155px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {STATUS_OPTIONS.map((key) => (
                            <button
                              key={key}
                              onClick={() => handleStatusChange(emp.id, key)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                            >
                              <StatusGlyph status={key} showLabel={false} />
                              <span className={`text-xs ${emp.status === key ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                                {key.charAt(0) + key.slice(1).toLowerCase()}
                              </span>
                              {emp.status === key && <span className="ml-auto text-brand-500 text-[10px]">✓</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/hr/employees/${emp.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                        >
                          View
                        </Link>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeletingId(emp.id) }}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove employee"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                            <path d="M5 2h6M2 4h12M6 7v5M10 7v5M3 4l1 9a2 2 0 002 2h4a2 2 0 002-2l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      {/* Delete confirmation dialog */}
      {deletingId && (() => {
        const emp = employees.find((e) => e.id === deletingId)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setDeletingId(null)}>
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-red-500" viewBox="0 0 16 16" fill="none">
                  <path d="M5 2h6M2 4h12M6 7v5M10 7v5M3 4l1 9a2 2 0 002 2h4a2 2 0 002-2l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900">Remove employee</h3>
              <p className="text-sm text-gray-500 mt-1">
                Are you sure you want to remove <span className="font-medium text-gray-700">{emp?.full_name}</span>? This will soft-delete their record.
              </p>
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setDeletingId(null)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await deleteEmployee.mutateAsync(deletingId)
                    setDeletingId(null)
                  }}
                  disabled={deleteEmployee.isPending}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deleteEmployee.isPending ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
