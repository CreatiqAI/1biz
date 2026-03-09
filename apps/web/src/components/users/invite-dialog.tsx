'use client'
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useInviteUser } from '@/hooks/use-users'

const AVAILABLE_ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access to all features' },
  { value: 'manager', label: 'Manager', description: 'Department-level management' },
  { value: 'accountant', label: 'Accountant', description: 'Accounting & financial access' },
  { value: 'hr_manager', label: 'HR Manager', description: 'HR & payroll management' },
  { value: 'sales', label: 'Sales', description: 'CRM & sales access' },
  { value: 'inventory', label: 'Inventory', description: 'Inventory management' },
  { value: 'employee', label: 'Employee', description: 'Basic self-service' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
]

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['employee'])
  const invite = useInviteUser()

  const [showSuccess, setShowSuccess] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  const resetForm = () => {
    setEmail('')
    setFullName('')
    setSelectedRoles(['employee'])
    setShowSuccess(false)
    setTempPassword(null)
    invite.reset()
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !fullName.trim() || selectedRoles.length === 0) return

    try {
      const result = await invite.mutateAsync({
        email: email.trim(),
        fullName: fullName.trim(),
        roles: selectedRoles,
      })
      if (result.tempPassword) {
        setTempPassword(result.tempPassword)
      }
      setShowSuccess(true)
    } catch {
      // error is available via invite.error
    }
  }

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    )
  }

  const copyPassword = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl z-50 w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
          <Dialog.Title className="text-lg font-semibold text-gray-900">
            {showSuccess ? 'User Invited' : 'Invite User'}
          </Dialog.Title>

          {showSuccess ? (
            <div className="mt-4 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-sm text-emerald-800 font-medium">
                  {invite.data?.isNewUser
                    ? 'New user created and added to your company.'
                    : 'Existing user added to your company.'}
                </p>
                <p className="text-xs text-emerald-600 mt-1">{invite.data?.email}</p>
              </div>

              {tempPassword && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Temporary Password</p>
                  <p className="text-xs text-gray-500">Share this with the user so they can log in. They should change it after first login.</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-100 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-mono text-gray-800 select-all">
                      {tempPassword}
                    </code>
                    <button
                      onClick={copyPassword}
                      className="shrink-0 px-3 py-2.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleClose}
                className="w-full py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@company.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ahmad bin Abdullah"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_ROLES.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => toggleRole(role.value)}
                      className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                        selectedRoles.includes(role.value)
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-medium text-xs">{role.label}</p>
                      <p className="text-[10px] opacity-70 mt-0.5">{role.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {invite.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{(invite.error as Error).message || 'Failed to invite user'}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invite.isPending || selectedRoles.length === 0}
                  className="flex-1 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {invite.isPending ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
