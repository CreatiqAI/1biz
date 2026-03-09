'use client'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'
import { useState } from 'react'

const settingSections = [
  {
    title: 'Company Information',
    desc: 'Company name, logo, address, SST number, registration number',
    icon: '🏢',
    href: '/settings',
    tag: 'Edit below',
  },
  {
    title: 'Users & Permissions',
    desc: 'Invite team members, set roles and access limits',
    icon: '👤',
    href: '/settings/users',
  },
  {
    title: 'Audit Log',
    desc: 'View all system activity and user actions',
    icon: '📊',
    href: '/settings/audit',
  },
  {
    title: 'WhatsApp Integration',
    desc: 'Connect WhatsApp to control 1Biz Assistant from your phone',
    icon: '📱',
    href: '/settings/whatsapp',
  },
]

const comingSoonSections = [
  {
    title: 'Tax Configuration',
    desc: 'SST rates, SST number, MyInvois LHDN settings',
    icon: '🧾',
  },
  {
    title: 'Bank Accounts',
    desc: 'Add company bank accounts for bank reconciliation',
    icon: '🏦',
  },
  {
    title: 'Notifications & Email',
    desc: 'Set notification emails and message templates',
    icon: '📧',
  },
]

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [showEdit, setShowEdit] = useState(false)
  const [companyName, setCompanyName] = useState(user?.companyName ?? '')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your company and platform configuration</p>
      </div>

      {/* Company Info Quick View */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
        <div className="w-14 h-14 bg-brand-100 rounded-xl flex items-center justify-center text-2xl">
          🏢
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500">Current company</p>
          <p className="font-semibold text-gray-900">{user?.companyName ?? '—'}</p>
          <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
        </div>
        <button
          onClick={() => { setCompanyName(user?.companyName ?? ''); setShowEdit(!showEdit) }}
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          {showEdit ? 'Close' : 'Edit'}
        </button>
      </div>

      {showEdit && (
        <div className="bg-white rounded-xl border border-brand-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Edit Company Information</h2>
          <p className="text-xs text-gray-400">Company name is set during registration. Contact support to change it.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Company Name</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
                value={companyName}
                disabled
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Admin Email</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
                value={user?.email ?? ''}
                disabled
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Setting Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingSections.map((section) => (
          <Link
            key={section.title}
            href={section.href}
            className="bg-white rounded-xl border border-gray-100 p-5 hover:border-brand-200 hover:bg-brand-50 transition-colors block"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">{section.icon}</span>
              <h3 className="text-sm font-medium text-gray-800">{section.title}</h3>
            </div>
            <p className="text-xs text-gray-500">{section.desc}</p>
          </Link>
        ))}
      </div>

      {/* Coming Soon Sections */}
      {comingSoonSections.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-3">Coming Soon</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comingSoonSections.map((section) => (
              <div
                key={section.title}
                className="bg-gray-50 rounded-xl border border-gray-100 p-5 opacity-60 cursor-not-allowed"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl">{section.icon}</span>
                  <h3 className="text-sm font-medium text-gray-600">{section.title}</h3>
                  <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full font-medium ml-auto">Soon</span>
                </div>
                <p className="text-xs text-gray-400">{section.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
