import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const get = <T>(url: string) => api.get<{ data: T }>(url).then((r) => r.data.data)
const post = <T>(url: string, body: unknown) => api.post<{ data: T }>(url, body).then((r) => r.data.data)
const patch = <T>(url: string, body: unknown) => api.patch<{ data: T }>(url, body).then((r) => r.data.data)
const del = <T>(url: string) => api.delete<{ data: T }>(url).then((r) => r.data.data)

// ─── Leads ────────────────────────────────────────────────────────────────────

export function useLeads(status?: string) {
  return useQuery({
    queryKey: ['leads', status],
    queryFn: () => get<any[]>(`/crm/leads${status ? `?status=${status}` : ''}`),
  })
}

export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string; company?: string; email?: string; phone?: string
      source?: string; expectedValueSen?: number; notes?: string
    }) => post('/crm/leads', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })
}

export function useUpdateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      patch(`/crm/leads/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })
}

export function useDeleteLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => del(`/crm/leads/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })
}

// ─── Opportunities ────────────────────────────────────────────────────────────

export function useOpportunities(stage?: string) {
  return useQuery({
    queryKey: ['opportunities', stage],
    queryFn: () => get<any[]>(`/crm/opportunities${stage ? `?stage=${stage}` : ''}`),
  })
}

export function useCreateOpportunity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string; leadId?: string; contactId?: string; stage?: string
      probability?: number; expectedValueSen?: number; expectedCloseDate?: string; notes?: string
    }) => post('/crm/opportunities', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunities'] }),
  })
}

export function useUpdateOpportunity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      patch(`/crm/opportunities/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunities'] }),
  })
}

// ─── Quotations ───────────────────────────────────────────────────────────────

export function useQuotations(status?: string) {
  return useQuery({
    queryKey: ['quotations', status],
    queryFn: () => get<any[]>(`/crm/quotations${status ? `?status=${status}` : ''}`),
  })
}

export function useQuotation(id: string) {
  return useQuery({
    queryKey: ['quotations', id],
    queryFn: () => get<any>(`/crm/quotations/${id}`),
    enabled: !!id,
  })
}

export function useCreateQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => post('/crm/quotations', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }),
  })
}

export function useUpdateQuotationStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      patch(`/crm/quotations/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }),
  })
}
