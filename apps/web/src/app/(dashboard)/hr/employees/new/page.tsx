'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

const MALAYSIAN_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
  'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Sabah',
  'Sarawak', 'Selangor', 'Terengganu', 'W.P. Kuala Lumpur',
  'W.P. Labuan', 'W.P. Putrajaya',
]

export default function NewEmployeePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    fullName: '',
    icNumber: '',
    dateOfBirth: '',
    gender: '',
    nationality: 'Malaysian',
    email: '',
    phone: '',
    addressLine1: '',
    city: '',
    state: '',
    postcode: '',
    employmentType: 'FULL_TIME',
    hireDate: new Date().toISOString().slice(0, 10),
    basicSalaryRM: '',
    bankName: '',
    bankAccountNumber: '',
    epfNumber: '',
    socsoNumber: '',
    incomeTaxNumber: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const basicSalarySen = form.basicSalaryRM ? Math.round(parseFloat(form.basicSalaryRM) * 100) : 0
      await api.post('/hr/employees', {
        ...form,
        basicSalarySen,
        basicSalaryRM: undefined,
      })
      router.push('/hr/employees')
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to create employee')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/hr/employees" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Employees
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-semibold text-gray-900">Add Employee</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Personal Information */}
        <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
              <input className={inputClass} value={form.fullName} onChange={set('fullName')} required placeholder="As per NRIC" />
            </div>
            <div>
              <label className={labelClass}>NRIC / IC Number</label>
              <input className={inputClass} value={form.icNumber} onChange={set('icNumber')} placeholder="e.g. 900101-14-5555" />
            </div>
            <div>
              <label className={labelClass}>Date of Birth</label>
              <input type="date" className={inputClass} value={form.dateOfBirth} onChange={set('dateOfBirth')} />
            </div>
            <div>
              <label className={labelClass}>Gender</label>
              <select className={inputClass} value={form.gender} onChange={set('gender')}>
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" className={inputClass} value={form.email} onChange={set('email')} placeholder="employee@company.com" />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input className={inputClass} value={form.phone} onChange={set('phone')} placeholder="01X-XXXXXXX" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Address</label>
              <input className={inputClass} value={form.addressLine1} onChange={set('addressLine1')} placeholder="Street address" />
            </div>
            <div>
              <label className={labelClass}>City</label>
              <input className={inputClass} value={form.city} onChange={set('city')} placeholder="e.g. Kuala Lumpur" />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <select className={inputClass} value={form.state} onChange={set('state')}>
                <option value="">Select state</option>
                {MALAYSIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Postcode</label>
              <input className={inputClass} value={form.postcode} onChange={set('postcode')} placeholder="e.g. 50000" maxLength={5} />
            </div>
          </div>
        </section>

        {/* Employment Details */}
        <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Employment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Employment Type</label>
              <select className={inputClass} value={form.employmentType} onChange={set('employmentType')}>
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Hire Date <span className="text-red-500">*</span></label>
              <input type="date" className={inputClass} value={form.hireDate} onChange={set('hireDate')} required />
            </div>
            <div>
              <label className={labelClass}>Basic Salary (RM)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass}
                value={form.basicSalaryRM}
                onChange={set('basicSalaryRM')}
                placeholder="e.g. 3500.00"
              />
            </div>
          </div>
        </section>

        {/* Bank & Statutory */}
        <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Bank & Statutory Numbers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Bank Name</label>
              <input className={inputClass} value={form.bankName} onChange={set('bankName')} placeholder="e.g. Maybank" />
            </div>
            <div>
              <label className={labelClass}>Bank Account Number</label>
              <input className={inputClass} value={form.bankAccountNumber} onChange={set('bankAccountNumber')} placeholder="Account number" />
            </div>
            <div>
              <label className={labelClass}>EPF Number</label>
              <input className={inputClass} value={form.epfNumber} onChange={set('epfNumber')} placeholder="KWSP member number" />
            </div>
            <div>
              <label className={labelClass}>SOCSO Number</label>
              <input className={inputClass} value={form.socsoNumber} onChange={set('socsoNumber')} placeholder="PERKESO number" />
            </div>
            <div>
              <label className={labelClass}>Income Tax Number</label>
              <input className={inputClass} value={form.incomeTaxNumber} onChange={set('incomeTaxNumber')} placeholder="e.g. SG 12345678090" />
            </div>
          </div>
        </section>

        {/* Emergency Contact */}
        <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Emergency Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Contact Name</label>
              <input className={inputClass} value={form.emergencyContactName} onChange={set('emergencyContactName')} placeholder="Full name" />
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              <input className={inputClass} value={form.emergencyContactPhone} onChange={set('emergencyContactPhone')} placeholder="01X-XXXXXXX" />
            </div>
            <div>
              <label className={labelClass}>Relationship</label>
              <input className={inputClass} value={form.emergencyContactRelation} onChange={set('emergencyContactRelation')} placeholder="e.g. Spouse, Parent" />
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving...' : 'Save Employee'}
          </button>
          <Link href="/hr/employees" className="text-sm text-gray-500 hover:text-gray-700">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
