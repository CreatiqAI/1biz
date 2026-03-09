'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEmployee, useUpdateEmployee, useUpdateEmployeeStatus, useLeaveBalances, useDepartments } from '@/hooks/use-hr'
import { formatDate, formatRinggit, getInitials } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PROBATION: 'bg-amber-100 text-amber-700',
  RESIGNED: 'bg-gray-100 text-gray-500',
  TERMINATED: 'bg-red-100 text-red-600',
  SUSPENDED: 'bg-orange-100 text-orange-700',
}

const MALAYSIAN_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
  'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Sabah',
  'Sarawak', 'Selangor', 'Terengganu', 'W.P. Kuala Lumpur',
  'W.P. Labuan', 'W.P. Putrajaya',
]

export default function EmployeeDetailPage() {
  const { id } = useParams() as { id: string }
  const { data: employee, isLoading, error } = useEmployee(id)
  const { data: leaveBalances = [] } = useLeaveBalances(id)
  const { data: departments = [] } = useDepartments()
  const updateEmployee = useUpdateEmployee()
  const updateStatus = useUpdateEmployeeStatus()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>(null)
  const [saveError, setSaveError] = useState('')
  const [showStatusForm, setShowStatusForm] = useState(false)
  const [statusForm, setStatusForm] = useState({ status: '', date: new Date().toISOString().slice(0, 10) })

  const startEdit = () => {
    setForm({
      fullName: employee.full_name,
      email: employee.email ?? '',
      phone: employee.phone ?? '',
      departmentId: employee.department_id ?? '',
      employmentType: employee.employment_type,
      basicSalarySen: employee.basic_salary_sen,
      bankName: employee.bank_name ?? '',
      bankAccountNumber: employee.bank_account_number ?? '',
      epfNumber: employee.epf_number ?? '',
      socsoNumber: employee.socso_number ?? '',
      incomeTaxNumber: employee.income_tax_number ?? '',
    })
    setEditing(true)
  }

  const handleSave = async () => {
    setSaveError('')
    try {
      await updateEmployee.mutateAsync({ id, ...form })
      setEditing(false)
    } catch (err: any) {
      setSaveError(err.response?.data?.message ?? 'Failed to save')
    }
  }

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateStatus.mutateAsync({ id, status: statusForm.status, date: statusForm.date })
    setShowStatusForm(false)
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (error || !employee) {
    return <div className="text-center py-20 text-red-500">Employee not found</div>
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev: any) => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-semibold">
            {getInitials(employee.full_name)}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Link href="/hr/employees" className="text-gray-400 hover:text-gray-600 text-sm">← Employees</Link>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">{employee.full_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_BADGE[employee.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {employee.status}
              </span>
              <span className="text-sm text-gray-500">{employee.employee_no}</span>
              {employee.department_name && <span className="text-sm text-gray-500">· {employee.department_name}</span>}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {!editing && (
            <>
              <button onClick={() => setShowStatusForm(true)} className="border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                Change Status
              </button>
              <button onClick={startEdit} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
                Edit
              </button>
            </>
          )}
          {editing && (
            <>
              <button onClick={handleSave} disabled={updateEmployee.isPending} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                {updateEmployee.isPending ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditing(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
            </>
          )}
        </div>
      </div>

      {saveError && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{saveError}</div>}

      {/* Status Change Form */}
      {showStatusForm && (
        <form onSubmit={handleStatusChange} className="bg-white rounded-xl border border-brand-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Change Employment Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>New Status</label>
              <select className={inputClass} value={statusForm.status} onChange={e => setStatusForm(f => ({ ...f, status: e.target.value }))} required>
                <option value="">Select status...</option>
                <option value="ACTIVE">Active</option>
                <option value="PROBATION">Probation</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="RESIGNED">Resigned</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Effective Date</label>
              <input type="date" className={inputClass} value={statusForm.date} onChange={e => setStatusForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={updateStatus.isPending} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {updateStatus.isPending ? 'Updating...' : 'Update Status'}
            </button>
            <button type="button" onClick={() => setShowStatusForm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Personal Info */}
        <div className="md:col-span-2 space-y-5">
          <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Full Name</label>
                {editing
                  ? <input className={inputClass} value={form.fullName} onChange={set('fullName')} />
                  : <p className="text-sm text-gray-800">{employee.full_name}</p>}
              </div>
              <div>
                <label className={labelClass}>NRIC / IC Number</label>
                <p className="text-sm text-gray-800">{employee.ic_number ?? '—'}</p>
              </div>
              <div>
                <label className={labelClass}>Date of Birth</label>
                <p className="text-sm text-gray-800">{employee.date_of_birth ? formatDate(employee.date_of_birth) : '—'}</p>
              </div>
              <div>
                <label className={labelClass}>Gender</label>
                <p className="text-sm text-gray-800">{employee.gender ?? '—'}</p>
              </div>
              <div>
                <label className={labelClass}>Email</label>
                {editing
                  ? <input type="email" className={inputClass} value={form.email} onChange={set('email')} />
                  : <p className="text-sm text-gray-800">{employee.email ?? '—'}</p>}
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                {editing
                  ? <input className={inputClass} value={form.phone} onChange={set('phone')} />
                  : <p className="text-sm text-gray-800">{employee.phone ?? '—'}</p>}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">Employment Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Department</label>
                {editing
                  ? (
                    <select className={inputClass} value={form.departmentId} onChange={set('departmentId')}>
                      <option value="">No department</option>
                      {(departments as any[]).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  )
                  : <p className="text-sm text-gray-800">{employee.department_name ?? '—'}</p>}
              </div>
              <div>
                <label className={labelClass}>Employment Type</label>
                {editing
                  ? (
                    <select className={inputClass} value={form.employmentType} onChange={set('employmentType')}>
                      <option value="FULL_TIME">Full-time</option>
                      <option value="PART_TIME">Part-time</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="INTERN">Intern</option>
                    </select>
                  )
                  : <p className="text-sm text-gray-800">{employee.employment_type}</p>}
              </div>
              <div>
                <label className={labelClass}>Hire Date</label>
                <p className="text-sm text-gray-800">{employee.hire_date ? formatDate(employee.hire_date) : '—'}</p>
              </div>
              <div>
                <label className={labelClass}>Basic Salary</label>
                {editing
                  ? <input type="number" step="0.01" className={inputClass} value={form.basicSalarySen / 100} onChange={e => setForm((prev: any) => ({ ...prev, basicSalarySen: Math.round(parseFloat(e.target.value) * 100) }))} />
                  : <p className="text-sm font-semibold text-gray-800">{formatRinggit(Number(employee.basic_salary_sen))}</p>}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">Bank & Statutory Numbers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Bank Name</label>
                {editing
                  ? <input className={inputClass} value={form.bankName} onChange={set('bankName')} />
                  : <p className="text-sm text-gray-800">{employee.bank_name ?? '—'}</p>}
              </div>
              <div>
                <label className={labelClass}>Bank Account</label>
                {editing
                  ? <input className={inputClass} value={form.bankAccountNumber} onChange={set('bankAccountNumber')} />
                  : <p className="text-sm font-mono text-gray-800">{employee.bank_account_number ?? '—'}</p>}
              </div>
              <div>
                <label className={labelClass}>EPF (KWSP) Number</label>
                {editing
                  ? <input className={inputClass} value={form.epfNumber} onChange={set('epfNumber')} />
                  : <p className="text-sm font-mono text-gray-800">{employee.epf_number ?? '—'}</p>}
              </div>
              <div>
                <label className={labelClass}>SOCSO (PERKESO) Number</label>
                {editing
                  ? <input className={inputClass} value={form.socsoNumber} onChange={set('socsoNumber')} />
                  : <p className="text-sm font-mono text-gray-800">{employee.socso_number ?? '—'}</p>}
              </div>
              <div>
                <label className={labelClass}>Income Tax Number</label>
                {editing
                  ? <input className={inputClass} value={form.incomeTaxNumber} onChange={set('incomeTaxNumber')} />
                  : <p className="text-sm font-mono text-gray-800">{employee.income_tax_number ?? '—'}</p>}
              </div>
            </div>
          </section>
        </div>

        {/* Leave Balances sidebar */}
        <div className="space-y-5">
          <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-800">Leave Balances {new Date().getFullYear()}</h2>
            {(leaveBalances as any[]).length === 0 ? (
              <p className="text-xs text-gray-400">No leave balances found</p>
            ) : (
              <div className="space-y-2">
                {(leaveBalances as any[]).map((lb: any) => (
                  <div key={lb.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-xs font-medium text-gray-700">{lb.leave_type_name ?? lb.leave_type_id}</p>
                      <p className="text-xs text-gray-400">Taken: {Number(lb.taken_days).toFixed(1)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-800">{Number(lb.entitled_days - lb.taken_days - lb.pending_days).toFixed(1)}</p>
                      <p className="text-xs text-gray-400">of {Number(lb.entitled_days).toFixed(1)} days</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-2">
            <h2 className="text-sm font-semibold text-gray-800">Quick Info</h2>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Employee No.</span>
                <span className="font-mono font-medium">{employee.employee_no}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Nationality</span>
                <span>{employee.nationality ?? '—'}</span>
              </div>
              {employee.emergency_contact_name && (
                <div className="pt-2 border-t border-gray-50">
                  <p className="text-xs text-gray-500 font-medium mb-1">Emergency Contact</p>
                  <p className="text-xs text-gray-700">{employee.emergency_contact_name}</p>
                  <p className="text-xs text-gray-500">{employee.emergency_contact_phone} · {employee.emergency_contact_relation}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
