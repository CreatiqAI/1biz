import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const get = <T>(url: string) => api.get<{ data: T }>(url).then((r) => r.data.data)
const post = <T>(url: string, body: unknown) => api.post<{ data: T }>(url, body).then((r) => r.data.data)
const patch = <T>(url: string, body: unknown) => api.patch<{ data: T }>(url, body).then((r) => r.data.data)
const del = <T>(url: string) => api.delete<{ data: T }>(url).then((r) => r.data.data)

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

export function useEmployees(status?: string) {
  return useQuery({
    queryKey: ['employees', status],
    queryFn: () => get<any[]>(`/hr/employees${status ? `?status=${status}` : ''}`),
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
