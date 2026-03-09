'use client'
import Link from 'next/link'
import { useHrStats } from '@/hooks/use-hr'
import { formatRinggit, formatDate } from '@/lib/utils'

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const complianceItems = [
  { label: 'EPF (KWSP)', desc: 'Employee: 9% · Employer: 12–13%', status: 'Auto-calculated', color: 'bg-green-100 text-green-700' },
  { label: 'SOCSO (PERKESO)', desc: 'Capped at RM4,000/month', status: 'Auto-calculated', color: 'bg-green-100 text-green-700' },
  { label: 'EIS', desc: '0.2% each, capped at RM4,000/month', status: 'Auto-calculated', color: 'bg-green-100 text-green-700' },
  { label: 'PCB / MTD', desc: 'Monthly tax deduction via LHDN tables', status: 'Auto-calculated', color: 'bg-green-100 text-green-700' },
]

export default function HrPage() {
  const { data: stats, isLoading } = useHrStats()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-semibold text-gray-900">HR & Payroll</h1></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  const payroll = stats?.lastPayroll
  const payrollLabel = payroll
    ? `${MONTH_NAMES[payroll.month]} ${payroll.year}`
    : '—'
  const payrollSub = payroll
    ? `${payroll.status} · Net ${formatRinggit(payroll.totalNetSen)}`
    : 'Not run yet'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">HR & Payroll</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage employees, leave, and Malaysian-compliant payroll in one place
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/hr/employees" className="bg-white rounded-xl border border-gray-100 p-5 hover:border-brand-200 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">Total Employees</p>
            <span className="text-lg">👤</span>
          </div>
          <p className="text-2xl font-semibold text-brand-600">{stats?.employees?.active ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">
            {stats?.employees?.probation ?? 0} on probation
          </p>
        </Link>
        <Link href="/hr/leave" className="bg-white rounded-xl border border-gray-100 p-5 hover:border-brand-200 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">On Leave Today</p>
            <span className="text-lg">📅</span>
          </div>
          <p className="text-2xl font-semibold text-amber-600">{stats?.onLeaveToday ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">Approved absences</p>
        </Link>
        <Link href="/hr/leave" className="bg-white rounded-xl border border-gray-100 p-5 hover:border-brand-200 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">Pending Leave</p>
            <span className="text-lg">⏳</span>
          </div>
          <p className={`text-2xl font-semibold ${(stats?.pendingLeave ?? 0) > 0 ? 'text-red-500' : 'text-green-600'}`}>
            {stats?.pendingLeave ?? 0}
          </p>
          <p className="text-xs text-gray-400 mt-1">Awaiting approval</p>
        </Link>
        <Link href="/hr/payroll" className="bg-white rounded-xl border border-gray-100 p-5 hover:border-brand-200 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">Last Payroll</p>
            <span className="text-lg">💰</span>
          </div>
          <p className="text-2xl font-semibold text-green-600">{payrollLabel}</p>
          <p className="text-xs text-gray-400 mt-1">{payrollSub}</p>
        </Link>
      </div>

      {/* Recent Employees */}
      {(stats?.recentEmployees ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Recent Employees</h2>
            <Link href="/hr/employees" className="text-xs text-brand-600 hover:text-brand-700 font-medium">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(stats?.recentEmployees ?? []).map((emp: any) => (
              <Link key={emp.id} href={`/hr/employees/${emp.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-800">{emp.full_name}</p>
                  <p className="text-xs text-gray-400">
                    {emp.employee_no} · {emp.department_name ?? 'No dept'} · {emp.position_name ?? 'No position'}
                  </p>
                </div>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  emp.status === 'ACTIVE' ? 'bg-green-100 text-green-700'
                    : emp.status === 'PROBATION' ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {emp.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'Employees', desc: 'View and manage all staff records', href: '/hr/employees', icon: '👤' },
          { label: 'Departments', desc: 'Organise teams and departments', href: '/hr/departments', icon: '🏢' },
          { label: 'Leave Management', desc: 'Approve and track leave requests', href: '/hr/leave', icon: '📅' },
          { label: 'Payroll', desc: 'Run monthly payroll with EPF, SOCSO & PCB', href: '/hr/payroll', icon: '💰' },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-colors"
          >
            <span className="text-2xl">{link.icon}</span>
            <div>
              <p className="text-sm font-medium text-gray-800">{link.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{link.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Malaysian Compliance */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-700">Malaysian Statutory Compliance</h2>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
            All auto-calculated
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {complianceItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.color}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Payroll calculations follow 2024 EPF, SOCSO, EIS, and LHDN PCB rates.
        </p>
      </div>
    </div>
  )
}
