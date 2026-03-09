'use client'
import { useState } from 'react'
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '@/hooks/use-hr'

export default function DepartmentsPage() {
  const { data: departments = [], isLoading, error } = useDepartments()
  const createDept = useCreateDepartment()
  const updateDept = useUpdateDepartment()
  const deleteDept = useDeleteDepartment()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', description: '' })
  const [formError, setFormError] = useState('')

  // Delete confirmation state (replaces confirm/alert)
  const [deletingDept, setDeletingDept] = useState<any | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    try {
      await createDept.mutateAsync({ name: form.name, code: form.code || undefined, description: form.description || undefined })
      setShowForm(false)
      setForm({ name: '', code: '', description: '' })
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Failed to create department')
    }
  }

  const handleToggleActive = async (dept: any) => {
    await updateDept.mutateAsync({ id: dept.id, isActive: !dept.is_active })
  }

  const handleDeleteConfirm = async () => {
    if (!deletingDept) return
    setDeleteError('')
    try {
      await deleteDept.mutateAsync(deletingDept.id)
      setDeletingDept(null)
    } catch (err: any) {
      setDeleteError(err.response?.data?.message ?? 'Cannot delete department')
      setDeletingDept(null)
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Departments</h1>
          <p className="text-gray-500 text-sm mt-1">
            {departments.length} department{departments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          + Add Department
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-brand-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">New Department</h2>
          {formError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Name <span className="text-red-500">*</span></label>
              <input className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="e.g. Finance" />
            </div>
            <div>
              <label className={labelClass}>Code</label>
              <input className={inputClass} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. FIN" maxLength={10} />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <input className={inputClass} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createDept.isPending} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {createDept.isPending ? 'Saving...' : 'Create'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormError('') }} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {/* Delete error banner */}
        {deleteError && (
          <div className="mx-5 mt-3 flex items-center justify-between bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-lg">
            <span>{deleteError}</span>
            <button onClick={() => setDeleteError('')} className="text-red-400 hover:text-red-600 ml-3 text-lg leading-none">&times;</button>
          </div>
        )}

        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 text-sm">Failed to load departments</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Department</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Code</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Employees</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-gray-400">
                    <p className="text-3xl mb-2">🏢</p>
                    <p className="text-sm">No departments yet — create one above</p>
                  </td>
                </tr>
              ) : (
                departments.map((dept: any) => (
                  <tr key={dept.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-800">{dept.name}</p>
                      {dept.description && <p className="text-xs text-gray-400 mt-0.5">{dept.description}</p>}
                    </td>
                    <td className="px-5 py-3">
                      {dept.code ? (
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{dept.code}</span>
                      ) : <span className="text-gray-300 text-sm">—</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700 font-medium">{Number(dept.employee_count)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${dept.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {dept.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleToggleActive(dept)}
                          className="text-xs text-gray-400 hover:text-gray-700"
                        >
                          {dept.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        {Number(dept.employee_count) === 0 && (
                          <button
                            onClick={() => { setDeletingDept(dept); setDeleteError('') }}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
        <p className="text-xs font-medium text-brand-800 mb-1">Tip</p>
        <p className="text-xs text-brand-700">Departments are used for payroll cost centres, leave approval routing, and organisational reporting.</p>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Delete Department</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">
                Delete <span className="font-semibold text-gray-800">&ldquo;{deletingDept.name}&rdquo;</span>? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingDept(null)}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleteDept.isPending}
                  className="flex-1 bg-red-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleteDept.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
