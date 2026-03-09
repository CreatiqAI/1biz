'use client'
import { useState } from 'react'
import { usePositions, useCreatePosition, useUpdatePosition, useDeletePosition, useDepartments } from '@/hooks/use-hr'

export default function PositionsPage() {
  const { data: positions = [], isLoading, error } = usePositions()
  const { data: departments = [] } = useDepartments()
  const createPos = useCreatePosition()
  const updatePos = useUpdatePosition()
  const deletePos = useDeletePosition()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', departmentId: '' })
  const [formError, setFormError] = useState('')
  const [deletingPos, setDeletingPos] = useState<any>(null)
  const [deleteError, setDeleteError] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    try {
      await createPos.mutateAsync({ name: form.name, departmentId: form.departmentId || undefined })
      setShowForm(false)
      setForm({ name: '', departmentId: '' })
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Failed to create position')
    }
  }

  const handleToggleActive = async (pos: any) => {
    await updatePos.mutateAsync({ id: pos.id, isActive: !pos.is_active })
  }

  const handleDeleteConfirm = async () => {
    if (!deletingPos) return
    try {
      await deletePos.mutateAsync(deletingPos.id)
      setDeletingPos(null)
      setDeleteError('')
    } catch (err: any) {
      setDeleteError(err.response?.data?.message ?? 'Cannot delete position')
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Positions</h1>
          <p className="text-gray-500 text-sm mt-1">
            {positions.length} position{positions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          + Add Position
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-brand-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">New Position</h2>
          {formError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Position Name <span className="text-red-500">*</span></label>
              <input className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="e.g. Software Engineer" />
            </div>
            <div>
              <label className={labelClass}>Department</label>
              <select className={inputClass} value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}>
                <option value="">No department</option>
                {(departments as any[]).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createPos.isPending} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {createPos.isPending ? 'Saving...' : 'Create'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormError('') }} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {deleteError && (
          <div className="mx-5 mt-3 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-lg flex items-center justify-between">
            <span>{deleteError}</span>
            <button onClick={() => setDeleteError('')} className="text-red-400 hover:text-red-600 ml-2">&times;</button>
          </div>
        )}
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 text-sm">Failed to load positions</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Position</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Department</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Employees</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-gray-400">
                    <p className="text-3xl mb-2">💼</p>
                    <p className="text-sm">No positions yet — create one above</p>
                  </td>
                </tr>
              ) : (
                positions.map((pos: any) => (
                  <tr key={pos.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-800">{pos.name}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{pos.department_name ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-700 font-medium">{Number(pos.employee_count)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${pos.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {pos.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleToggleActive(pos)}
                          className="text-xs text-gray-400 hover:text-gray-700"
                        >
                          {pos.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        {Number(pos.employee_count) === 0 && (
                          <button
                            onClick={() => setDeletingPos(pos)}
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

      {/* Delete Confirmation Modal */}
      {deletingPos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Delete Position</h2>
            <p className="text-sm text-gray-600">
              Delete &quot;{deletingPos.name}&quot;? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setDeletingPos(null); setDeleteError('') }}
                className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deletePos.isPending}
                className="flex-1 bg-red-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deletePos.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
