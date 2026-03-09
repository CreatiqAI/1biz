'use client'
import { useState, useEffect } from 'react'
import { usePayrollRuns, useCreatePayrollRun, useGeneratePayroll, useApprovePayroll, useMarkPayrollPaid, usePayrollItems } from '@/hooks/use-hr'
import { formatRinggit } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  PROCESSING: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function PayrollItems({ runId }: { runId: string }) {
  const { data: items = [], isLoading } = usePayrollItems(runId)
  if (isLoading) return <div className="p-4 text-xs text-gray-400">Loading payslips...</div>
  if (!items.length) return <div className="p-4 text-xs text-gray-400">No items yet — click Generate to calculate.</div>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left font-medium text-gray-400 px-4 py-2">Employee</th>
            <th className="text-right font-medium text-gray-400 px-4 py-2">Gross</th>
            <th className="text-right font-medium text-gray-400 px-4 py-2">EPF (EE)</th>
            <th className="text-right font-medium text-gray-400 px-4 py-2">SOCSO (EE)</th>
            <th className="text-right font-medium text-gray-400 px-4 py-2">EIS (EE)</th>
            <th className="text-right font-medium text-gray-400 px-4 py-2">PCB</th>
            <th className="text-right font-medium text-gray-400 px-4 py-2">Net Pay</th>
            <th className="text-right font-medium text-gray-400 px-4 py-2">EPF (ER)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item: any) => (
            <tr key={item.id} className="hover:bg-white">
              <td className="px-4 py-2">
                <p className="font-medium text-gray-800">{item.full_name}</p>
                <p className="text-gray-400">{item.employee_no} · {item.department_name ?? '—'}</p>
              </td>
              <td className="px-4 py-2 text-right text-gray-700">{formatRinggit(Number(item.gross_salary_sen))}</td>
              <td className="px-4 py-2 text-right text-red-500">{formatRinggit(Number(item.epf_employee_sen))}</td>
              <td className="px-4 py-2 text-right text-red-500">{formatRinggit(Number(item.socso_employee_sen))}</td>
              <td className="px-4 py-2 text-right text-red-500">{formatRinggit(Number(item.eis_employee_sen))}</td>
              <td className="px-4 py-2 text-right text-red-500">{formatRinggit(Number(item.pcb_sen))}</td>
              <td className="px-4 py-2 text-right font-semibold text-green-700">{formatRinggit(Number(item.net_salary_sen))}</td>
              <td className="px-4 py-2 text-right text-amber-600">{formatRinggit(Number(item.epf_employer_sen))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function PayrollPage() {
  const { data: runs = [], isLoading } = usePayrollRuns()
  const createRun = useCreatePayrollRun()
  const generatePayroll = useGeneratePayroll()
  const approvePayroll = useApprovePayroll()
  const markPaid = useMarkPayrollPaid()

  const [showNewRun, setShowNewRun] = useState(false)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const currentDate = new Date()
  const [form, setForm] = useState({ month: currentDate.getMonth() + 1, year: currentDate.getFullYear(), notes: '' })

  // Action state (replaces alert/confirm)
  const [actionError, setActionError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'markPaid'; runId: string } | null>(null)

  // Auto-dismiss success message after 4 seconds
  useEffect(() => {
    if (!successMsg) return
    const timer = setTimeout(() => setSuccessMsg(''), 4000)
    return () => clearTimeout(timer)
  }, [successMsg])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    try {
      await createRun.mutateAsync(form)
      setShowNewRun(false)
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Failed to create payroll run')
    }
  }

  const handleGenerate = async (runId: string) => {
    setActionError('')
    try {
      const result: any = await generatePayroll.mutateAsync(runId)
      setSuccessMsg(`Generated payslips for ${result.generated} employees`)
      setExpandedRun(runId)
    } catch (err: any) {
      setActionError(err.response?.data?.message ?? 'Failed to generate payroll')
    }
  }

  const handleConfirmAction = async () => {
    if (!confirmAction) return
    setActionError('')
    try {
      if (confirmAction.type === 'approve') {
        await approvePayroll.mutateAsync(confirmAction.runId)
      } else {
        await markPaid.mutateAsync(confirmAction.runId)
      }
      setConfirmAction(null)
    } catch (err: any) {
      setActionError(err.response?.data?.message ?? `Failed to ${confirmAction.type === 'approve' ? 'approve' : 'mark as paid'}`)
      setConfirmAction(null)
    }
  }

  const confirmMessages: Record<string, string> = {
    approve: 'Approve this payroll run?',
    markPaid: 'Mark this payroll as PAID? This confirms salaries have been disbursed.',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payroll</h1>
          <p className="text-gray-500 text-sm mt-1">Malaysian-compliant payroll with EPF, SOCSO, EIS & PCB auto-calculated</p>
        </div>
        <button onClick={() => setShowNewRun(!showNewRun)} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          + New Payroll Run
        </button>
      </div>

      {/* New Run Form */}
      {showNewRun && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-brand-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Create Payroll Run</h2>
          {formError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500" value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: Number(e.target.value) }))}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}>
                {[currentDate.getFullYear(), currentDate.getFullYear() - 1].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createRun.isPending} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {createRun.isPending ? 'Creating...' : 'Create Run'}
            </button>
            <button type="button" onClick={() => setShowNewRun(false)} className="text-sm text-gray-500 px-4 py-2 hover:text-gray-700">Cancel</button>
          </div>
        </form>
      )}

      {/* Payroll Run List */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-700">Payroll History</h2>
        </div>

        {/* Success banner */}
        {successMsg && (
          <div className="mx-5 mt-3 flex items-center justify-between bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-2.5 rounded-lg">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="text-green-400 hover:text-green-600 ml-3 text-lg leading-none">&times;</button>
          </div>
        )}

        {/* Error banner */}
        {actionError && (
          <div className="mx-5 mt-3 flex items-center justify-between bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-lg">
            <span>{actionError}</span>
            <button onClick={() => setActionError('')} className="text-red-400 hover:text-red-600 ml-3 text-lg leading-none">&times;</button>
          </div>
        )}

        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : runs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-2xl mb-2">💰</p>
            <p className="text-sm">No payroll runs yet — click &quot;New Payroll Run&quot; to start</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {runs.map((run: any) => (
              <div key={run.id}>
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800">{MONTHS[run.period_month - 1]} {run.period_year}</p>
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_BADGE[run.status]}`}>{run.status}</span>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-gray-500">
                      <span>{run.employee_count} employees</span>
                      {Number(run.total_gross_sen) > 0 && (
                        <>
                          <span>Gross: {formatRinggit(Number(run.total_gross_sen))}</span>
                          <span>Net: <span className="font-semibold text-gray-700">{formatRinggit(Number(run.total_net_sen))}</span></span>
                          <span>EPF (ER): {formatRinggit(Number(run.total_epf_employer_sen))}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {run.status === 'DRAFT' && (
                      <button onClick={() => handleGenerate(run.id)} disabled={generatePayroll.isPending} className="text-xs font-medium px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50">
                        {generatePayroll.isPending ? 'Generating...' : 'Generate'}
                      </button>
                    )}
                    {run.status === 'PROCESSING' && (
                      <>
                        <button onClick={() => handleGenerate(run.id)} disabled={generatePayroll.isPending} className="text-xs font-medium px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50">Regenerate</button>
                        <button onClick={() => setConfirmAction({ type: 'approve', runId: run.id })} disabled={approvePayroll.isPending} className="text-xs font-medium px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 disabled:opacity-50">Approve</button>
                      </>
                    )}
                    {run.status === 'APPROVED' && (
                      <button onClick={() => setConfirmAction({ type: 'markPaid', runId: run.id })} disabled={markPaid.isPending} className="text-xs font-medium px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50">Mark Paid</button>
                    )}
                    <button onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)} className="text-xs text-gray-400 hover:text-gray-700 px-2">
                      {expandedRun === run.id ? 'Hide' : 'View Payslips'}
                    </button>
                  </div>
                </div>
                {expandedRun === run.id && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    <PayrollItems runId={run.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reference tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Statutory Rates (2024)</h2>
          <div className="space-y-2 text-xs">
            {[['EPF Employee','9% of gross'],['EPF Employer (≤RM5,000)','13%'],['EPF Employer (>RM5,000)','12%'],['SOCSO Employee','0.5%, capped RM4,000'],['SOCSO Employer','1.75%, capped RM4,000'],['EIS Employee','0.2%, capped RM4,000'],['EIS Employer','0.2%, capped RM4,000']].map(([l,r]) => (
              <div key={l} className="flex justify-between py-1 border-b border-gray-50 last:border-0">
                <span className="text-gray-600">{l}</span><span className="font-medium text-gray-800">{r}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">PCB Tax Brackets (2024)</h2>
          <div className="space-y-1 text-xs">
            {[['Up to RM5,000','0%'],['RM5,001 – RM20,000','1%'],['RM20,001 – RM35,000','3%'],['RM35,001 – RM50,000','8%'],['RM50,001 – RM70,000','13%'],['RM70,001 – RM100,000','21%'],['RM100,001 – RM250,000','24%'],['Above RM250,000','24.5–28%']].map(([r,t]) => (
              <div key={r} className="flex justify-between py-1 border-b border-gray-50 last:border-0">
                <span className="text-gray-600">{r}</span><span className="font-medium text-gray-800">{t}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">After personal relief (RM9,000) + EPF relief</p>
        </div>
      </div>

      {/* Confirmation Modal for Approve / Mark Paid */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {confirmAction.type === 'approve' ? 'Approve Payroll' : 'Mark Payroll as Paid'}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">{confirmMessages[confirmAction.type]}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={approvePayroll.isPending || markPaid.isPending}
                  className={`flex-1 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                    confirmAction.type === 'approve'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {(approvePayroll.isPending || markPaid.isPending)
                    ? 'Processing...'
                    : confirmAction.type === 'approve' ? 'Approve' : 'Mark Paid'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
