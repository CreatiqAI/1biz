import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const get = <T>(url: string) => api.get<{ data: T }>(url).then((r) => r.data.data)
const post = <T>(url: string, body: unknown) => api.post<{ data: T }>(url, body).then((r) => r.data.data)
const patch = <T>(url: string, body: unknown) => api.patch<{ data: T }>(url, body).then((r) => r.data.data)
const del = <T>(url: string) => api.delete<{ data: T }>(url).then((r) => r.data.data)

export interface Employee {
  id: string
  employee_no: string
  full_name: string
  email: string | null
  phone: string | null
  status: string
  employment_type: string
  hire_date: string | null
  basic_salary_sen: string | null
  department_name: string | null
  position_name: string | null
  [key: string]: unknown
}

// ─── HR Overview ────────────────────────────────────────────────────────────

export function useHrStats() {
  return useQuery({
    queryKey: ['hr-stats'],
    queryFn: () => get<any>('/dashboard/hr'),
  })
}

// ─── Departments ─────────────────────────────────────────────────────────────

export function useDepartments() {
  return useQuery({ queryKey: ['departments'], queryFn: () => get<any[]>('/hr/departments') })
}

export function useCreateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; code?: string; description?: string }) =>
      post('/hr/departments', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  })
}

export function useUpdateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; isActive?: boolean }) =>
      patch(`/hr/departments/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  })
}

export function useDeleteDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => del(`/hr/departments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  })
}

// ─── Positions ───────────────────────────────────────────────────────────────

export function usePositions() {
  return useQuery({ queryKey: ['positions'], queryFn: () => get<any[]>('/hr/positions') })
}

export function useCreatePosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; departmentId?: string }) =>
      post('/hr/positions', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['positions'] }),
  })
}

export function useUpdatePosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; departmentId?: string; isActive?: boolean }) =>
      patch(`/hr/positions/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['positions'] }),
  })
}

export function useDeletePosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => del(`/hr/positions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['positions'] }),
  })
}

// ─── Employees ───────────────────────────────────────────────────────────────

export function useEmployees(statusOrParams?: string | { status?: string; search?: string; page?: number; limit?: number }) {
  const params = typeof statusOrParams === 'string' ? { status: statusOrParams } : statusOrParams
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.search) qs.set('search', params.search)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const queryString = qs.toString()
  return useQuery({
    queryKey: ['employees', params?.status, params?.search, params?.page],
    queryFn: async (): Promise<Employee[]> => {
      const r = await api.get<any>(`/hr/employees${queryString ? `?${queryString}` : ''}`)
      return r.data?.data ?? []
    },
  })
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: () => get<any>(`/hr/employees/${id}`),
    enabled: !!id,
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => post('/hr/employees', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['hr-stats'] })
    },
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      patch(`/hr/employees/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['hr-stats'] })
    },
  })
}

export function useUpdateEmployeeStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, date }: { id: string; status: string; date?: string }) =>
      patch(`/hr/employees/${id}/status`, { status, date }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['hr-stats'] })
    },
  })
}

export function useDeleteEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => del(`/hr/employees/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['hr-stats'] })
    },
  })
}

// ─── Leave ───────────────────────────────────────────────────────────────────

export function useLeaveTypes() {
  return useQuery({ queryKey: ['leave-types'], queryFn: () => get<any[]>('/hr/leave/types') })
}

export function useLeaveRequests(employeeId?: string, status?: string) {
  const params = new URLSearchParams()
  if (employeeId) params.set('employeeId', employeeId)
  if (status) params.set('status', status)
  const qs = params.toString()
  return useQuery({
    queryKey: ['leave-requests', employeeId, status],
    queryFn: () => get<any[]>(`/hr/leave/requests${qs ? `?${qs}` : ''}`),
  })
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      employeeId: string; leaveTypeId: string; startDate: string; endDate: string; days: number; reason?: string
    }) => post('/hr/leave/requests', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] })
      qc.invalidateQueries({ queryKey: ['hr-stats'] })
    },
  })
}

export function useApproveLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => patch(`/hr/leave/requests/${id}/approve`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] })
      qc.invalidateQueries({ queryKey: ['hr-stats'] })
    },
  })
}

export function useRejectLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      patch(`/hr/leave/requests/${id}/reject`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] })
      qc.invalidateQueries({ queryKey: ['hr-stats'] })
    },
  })
}

export function useLeaveBalances(employeeId: string, year?: number) {
  return useQuery({
    queryKey: ['leave-balances', employeeId, year],
    queryFn: () => get<any[]>(`/hr/leave/balances/${employeeId}${year ? `?year=${year}` : ''}`),
    enabled: !!employeeId,
  })
}

export function useInitLeaveBalances() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ employeeId, year }: { employeeId: string; year?: number }) =>
      post(`/hr/leave/balances/${employeeId}/init`, { year }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-balances'] }),
  })
}

export function useInitAllLeaveBalances() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { year?: number }) => post('/hr/leave/balances/init-all', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-balances'] }),
  })
}

// ─── Holidays ─────────────────────────────────────────────────────────────────

export function useHolidays(year?: number) {
  return useQuery({
    queryKey: ['holidays', year],
    queryFn: () => get<any[]>(`/hr/holidays${year ? `?year=${year}` : ''}`),
  })
}

export function useCreateHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; date: string; isMandatory?: boolean; state?: string }) =>
      post('/hr/holidays', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }),
  })
}

export function useUpdateHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; date?: string; isMandatory?: boolean; state?: string }) =>
      patch(`/hr/holidays/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }),
  })
}

export function useDeleteHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => del(`/hr/holidays/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }),
  })
}

export function useSeedHolidays() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { year?: number }) => post('/hr/holidays/seed', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }),
  })
}

// ─── Employment History ───────────────────────────────────────────────────────

export function useEmploymentHistory(employeeId: string) {
  return useQuery({
    queryKey: ['employment-history', employeeId],
    queryFn: () => get<any[]>(`/hr/employees/${employeeId}/history`),
    enabled: !!employeeId,
  })
}

export function useRecordJobChange() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ employeeId, ...data }: { employeeId: string; changeType: string; effectiveDate: string; departmentId?: string; positionId?: string; basicSalarySen?: number; reason?: string }) =>
      post(`/hr/employees/${employeeId}/job-change`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['employment-history'] })
    },
  })
}

export function useTerminationPreview(employeeId: string, terminationDate: string) {
  return useQuery({
    queryKey: ['termination-preview', employeeId, terminationDate],
    queryFn: () => get<any>(`/hr/employees/${employeeId}/termination-preview?terminationDate=${terminationDate}`),
    enabled: !!employeeId && !!terminationDate,
  })
}

export function useProcessTermination() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ employeeId, ...data }: { employeeId: string; terminationDate: string; reason?: string }) =>
      post(`/hr/employees/${employeeId}/terminate`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['employment-history'] })
      qc.invalidateQueries({ queryKey: ['hr-stats'] })
    },
  })
}

// ─── Attendance / Work Entries ──────────────────────────────────────────────

export function useWorkEntries(employeeId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['work-entries', employeeId, startDate, endDate],
    queryFn: () => get<any[]>(`/hr/attendance/entries/${employeeId}?startDate=${startDate}&endDate=${endDate}`),
    enabled: !!employeeId && !!startDate && !!endDate,
  })
}

export function useMonthlyWorkEntries(year: number, month: number) {
  return useQuery({
    queryKey: ['work-entries-monthly', year, month],
    queryFn: () => get<any[]>(`/hr/attendance/monthly?year=${year}&month=${month}`),
  })
}

export function useUpsertWorkEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      employeeId: string; date: string; normalHours?: number; overtimeHours?: number;
      restDayHours?: number; phHours?: number; isRestDay?: boolean; isPublicHoliday?: boolean;
      isAbsent?: boolean; isLate?: boolean; notes?: string
    }) => post('/hr/attendance/entries', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-entries'] }),
  })
}

export function useBulkUpsertWorkEntries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { entries: any[] }) => post('/hr/attendance/entries/bulk', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-entries'] }),
  })
}

export function useDeleteWorkEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => del(`/hr/attendance/entries/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-entries'] }),
  })
}

export function useAttendanceSummary(employeeId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['attendance-summary', employeeId, year, month],
    queryFn: () => get<any>(`/hr/attendance/summary/${employeeId}?year=${year}&month=${month}`),
    enabled: !!employeeId,
  })
}

export function useAllAttendanceSummaries(year: number, month: number) {
  return useQuery({
    queryKey: ['attendance-summaries', year, month],
    queryFn: () => get<any[]>(`/hr/attendance/summaries?year=${year}&month=${month}`),
  })
}

// ─── Claims ─────────────────────────────────────────────────────────────────

export function useClaimTypes() {
  return useQuery({ queryKey: ['claim-types'], queryFn: () => get<any[]>('/hr/claims/types') })
}

export function useCreateClaimType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; code: string; description?: string; requiresReceipt?: boolean; monthlyLimitSen?: number }) =>
      post('/hr/claims/types', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claim-types'] }),
  })
}

export function useClaims(employeeId?: string, status?: string) {
  const params = new URLSearchParams()
  if (employeeId) params.set('employeeId', employeeId)
  if (status) params.set('status', status)
  const qs = params.toString()
  return useQuery({
    queryKey: ['claims', employeeId, status],
    queryFn: () => get<any[]>(`/hr/claims${qs ? `?${qs}` : ''}`),
  })
}

export function useClaim(id: string) {
  return useQuery({
    queryKey: ['claims', id],
    queryFn: () => get<any>(`/hr/claims/${id}`),
    enabled: !!id,
  })
}

export function useCreateClaim() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      employeeId: string; claimDate: string; notes?: string;
      lines: Array<{ claimTypeId: string; description: string; amountSen: number; receiptUrl?: string; date: string }>
    }) => post('/hr/claims', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claims'] }),
  })
}

export function useApproveClaim() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => patch(`/hr/claims/${id}/approve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claims'] }),
  })
}

export function useRejectClaim() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      patch(`/hr/claims/${id}/reject`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claims'] }),
  })
}

// ─── Payroll ─────────────────────────────────────────────────────────────────

export function usePayrollRuns() {
  return useQuery({ queryKey: ['payroll-runs'], queryFn: () => get<any[]>('/hr/payroll/runs') })
}

export function usePayrollRun(id: string) {
  return useQuery({
    queryKey: ['payroll-runs', id],
    queryFn: () => get<any>(`/hr/payroll/runs/${id}`),
    enabled: !!id,
  })
}

export function usePayrollItems(runId: string) {
  return useQuery({
    queryKey: ['payroll-items', runId],
    queryFn: () => get<any[]>(`/hr/payroll/runs/${runId}/items`),
    enabled: !!runId,
  })
}

export function useCreatePayrollRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { month: number; year: number; notes?: string }) =>
      post('/hr/payroll/runs', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-runs'] }),
  })
}

export function useGeneratePayroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (runId: string) => post(`/hr/payroll/runs/${runId}/generate`, {}),
    onSuccess: (_, runId) => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] })
      qc.invalidateQueries({ queryKey: ['payroll-items', runId] })
    },
  })
}

export function useApprovePayroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (runId: string) => patch(`/hr/payroll/runs/${runId}/approve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-runs'] }),
  })
}

export function useMarkPayrollPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (runId: string) => patch(`/hr/payroll/runs/${runId}/mark-paid`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-runs'] }),
  })
}
