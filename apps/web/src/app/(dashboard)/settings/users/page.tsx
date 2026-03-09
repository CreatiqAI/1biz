'use client'
import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useTenantUsers, useUpdateUserRoles, useRemoveUser } from '@/hooks/use-users'
import { InviteDialog } from '@/components/users/invite-dialog'
import { useToast } from '@/components/ui/toast'

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-600',
  manager: 'bg-purple-100 text-purple-600',
  accountant: 'bg-blue-100 text-blue-600',
  hr_manager: 'bg-pink-100 text-pink-600',
  sales: 'bg-orange-100 text-orange-600',
  inventory: 'bg-green-100 text-green-600',
  cashier: 'bg-yellow-100 text-yellow-700',
  employee: 'bg-gray-100 text-gray-600',
  viewer: 'bg-slate-100 text-slate-600',
  super_admin: 'bg-rose-100 text-rose-700',
}

export default function UsersPage() {
  const { user: currentUser } = useAuthStore()
  const { data: tenantUsers, isLoading } = useTenantUsers()
  const updateRoles = useUpdateUserRoles()
  const removeUser = useRemoveUser()
  const { toast } = useToast()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editRoles, setEditRoles] = useState<string[]>([])

  const handleStartEdit = (userId: string, roles: string[]) => {
    setEditingUserId(userId)
    setEditRoles(roles)
  }

  const handleSaveRoles = async (userId: string) => {
    try {
      await updateRoles.mutateAsync({ userId, roles: editRoles })
      toast({ title: 'Roles updated', variant: 'success' })
      setEditingUserId(null)
    } catch {
      toast({ title: 'Failed to update roles', variant: 'error' })
    }
  }

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from this company?`)) return
    try {
      await removeUser.mutateAsync(userId)
      toast({ title: `${name} removed`, variant: 'success' })
    } catch (err) {
      toast({ title: (err as Error).message || 'Failed to remove user', variant: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm mt-1">Manage team members and their access levels</p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <span>+</span> Invite User
        </button>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">User</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Email</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Roles</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Last Login</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">
                  Loading users...
                </td>
              </tr>
            ) : !tenantUsers?.length ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">
                  No team members yet. Click &quot;Invite User&quot; to add someone.
                </td>
              </tr>
            ) : (
              tenantUsers.map((tu) => {
                const u = tu.user
                const isCurrentUser = u.id === currentUser?.id
                const isEditing = editingUserId === u.id

                return (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-xs font-semibold text-brand-700">
                          {u.fullName?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {u.fullName}
                            {isCurrentUser && <span className="text-xs text-gray-400 ml-1">(you)</span>}
                          </p>
                          {tu.isOwner && (
                            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                              Owner
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{u.email}</td>
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <div className="flex flex-wrap gap-1">
                          {['admin', 'manager', 'accountant', 'hr_manager', 'sales', 'inventory', 'employee', 'viewer'].map(
                            (r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() =>
                                  setEditRoles((prev) =>
                                    prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
                                  )
                                }
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                                  editRoles.includes(r)
                                    ? ROLE_COLORS[r] || 'bg-gray-100 text-gray-600'
                                    : 'bg-gray-50 text-gray-300'
                                }`}
                              >
                                {r.replace('_', ' ')}
                              </button>
                            ),
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {tu.roles.map((r) => (
                            <span
                              key={r}
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                ROLE_COLORS[r] || 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {r.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          u.isActive
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-400">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleDateString('en-MY')
                        : 'Never'}
                    </td>
                    <td className="px-5 py-3">
                      {!tu.isOwner && !isCurrentUser && (
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveRoles(u.id)}
                                disabled={updateRoles.isPending}
                                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="text-xs text-gray-400 hover:text-gray-600"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(u.id, tu.roles)}
                                className="text-xs text-gray-400 hover:text-gray-600"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleRemove(u.id, u.fullName)}
                                className="text-xs text-red-400 hover:text-red-600"
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  )
}
