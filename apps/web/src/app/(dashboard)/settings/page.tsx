'use client'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'
import { useState } from 'react'
import { useTenantSettings, useUpdateTenantSettings, useDeleteAccount } from '@/hooks/use-settings'
import { useRouter } from 'next/navigation'

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
  {
    title: 'E-Invoice (MyInvois)',
    desc: 'Configure LHDN e-invoicing credentials for electronic invoice submission',
    icon: '🧾',
    href: '/settings/einvoice',
  },
]

const comingSoonSections = [
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
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const [showEdit, setShowEdit] = useState(false)
  const [companyName, setCompanyName] = useState(user?.companyName ?? '')

  // AI usage
  const { data: settings } = useTenantSettings()
  const updateSettings = useUpdateTenantSettings()
  const [editingAiLimit, setEditingAiLimit] = useState(false)
  const [aiLimit, setAiLimit] = useState<number>(500)

  // Account deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const deleteAccount = useDeleteAccount()

  const aiUsed = settings?.aiMessagesUsed ?? 0
  const aiMax = settings?.aiMessageLimit ?? 500
  const aiPercent = aiMax > 0 ? Math.min(100, Math.round((aiUsed / aiMax) * 100)) : 0
  const resetDate = settings?.aiUsageResetAt ? new Date(settings.aiUsageResetAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  const handleSaveAiLimit = async () => {
    await updateSettings.mutateAsync({ aiMessageLimit: aiLimit })
    setEditingAiLimit(false)
  }

  const handleDeleteAccount = async () => {
    setDeleteError('')
    try {
      await deleteAccount.mutateAsync({ password: deletePassword, confirmation: deleteConfirm })
      logout()
      router.push('/login')
    } catch (err: any) {
      setDeleteError(err?.response?.data?.message || 'Failed to delete account')
    }
  }

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

      {/* AI Assistant Usage */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">AI Assistant</h3>
              <p className="text-xs text-gray-500">Monthly message usage and limits</p>
            </div>
          </div>
          {!editingAiLimit ? (
            <button
              onClick={() => { setAiLimit(aiMax); setEditingAiLimit(true) }}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              Edit limit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={aiLimit}
                onChange={(e) => setAiLimit(Number(e.target.value))}
                className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700"
              />
              <button
                onClick={handleSaveAiLimit}
                disabled={updateSettings.isPending}
                className="text-xs bg-brand-600 text-white px-3 py-1 rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setEditingAiLimit(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Usage bar */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-sm font-medium text-gray-700">
              {aiUsed.toLocaleString()} <span className="text-gray-400 font-normal">/ {aiMax === 0 ? 'Unlimited' : aiMax.toLocaleString()}</span>
            </span>
            <span className="text-xs text-gray-400">Resets {resetDate}</span>
          </div>
          {aiMax > 0 && (
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${aiPercent >= 90 ? 'bg-red-500' : aiPercent >= 70 ? 'bg-amber-500' : 'bg-violet-500'}`}
                style={{ width: `${aiPercent}%` }}
              />
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-1.5">
            {aiMax === 0 ? 'Unlimited messages enabled.' : `${aiPercent}% used this billing period. Set to 0 for unlimited.`}
          </p>
        </div>
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

      {/* Danger Zone */}
      <div className="border border-red-200 rounded-xl p-5 bg-red-50/30 space-y-3">
        <h2 className="text-sm font-semibold text-red-700">Danger Zone</h2>
        <p className="text-xs text-red-600/70">
          Permanently delete your account and all company data. This action cannot be undone.
        </p>
        <button
          onClick={() => { setShowDeleteModal(true); setDeletePassword(''); setDeleteConfirm(''); setDeleteError('') }}
          className="text-xs font-medium text-red-600 border border-red-300 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors"
        >
          Delete Account
        </button>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Delete your account</h3>
              <p className="text-sm text-gray-500 mt-1">
                This will permanently delete your account, all company data, invoices, employees, and financial records. This cannot be undone.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Your password</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Enter your current password"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Type <span className="font-bold text-red-600">DELETE MY ACCOUNT</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="DELETE MY ACCOUNT"
                />
              </div>
              {deleteError && (
                <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{deleteError}</p>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteAccount.isPending || deleteConfirm !== 'DELETE MY ACCOUNT' || !deletePassword}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleteAccount.isPending ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
