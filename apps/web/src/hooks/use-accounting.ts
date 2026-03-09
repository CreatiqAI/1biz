import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const get = <T>(url: string) => api.get<{ data: T }>(url).then((r) => r.data.data)
const post = <T>(url: string, body: unknown) => api.post<{ data: T }>(url, body).then((r) => r.data.data)
const patch = <T>(url: string, body: unknown) => api.patch<{ data: T }>(url, body).then((r) => r.data.data)
const del = <T>(url: string) => api.delete<{ data: T }>(url).then((r) => r.data.data)

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => get<any>('/dashboard/stats'),
    refetchInterval: 30_000, // auto-refresh every 30s
  })
}

export function useAccountingStats() {
  return useQuery({
    queryKey: ['accounting-stats'],
    queryFn: () => get<any>('/dashboard/accounting'),
  })
}

// ─── Chart of Accounts ───────────────────────────────────────────────────────

export function useAccounts() {
  return useQuery({ queryKey: ['accounts'], queryFn: () => get<any[]>('/accounting/accounts') })
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export function useContacts(type?: 'CUSTOMER' | 'SUPPLIER' | 'BOTH') {
  return useQuery({
    queryKey: ['contacts', type],
    queryFn: () => get<any[]>(`/accounting/contacts${type ? `?type=${type}` : ''}`),
  })
}

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      type: string; name: string; companyName?: string; email?: string; phone?: string
      icNo?: string; regNo?: string; taxId?: string
      addressLine1?: string; city?: string; state?: string; postcode?: string
      paymentTerms?: number; notes?: string
    }) => post('/accounting/contacts', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })
}

export function useUpdateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      patch(`/accounting/contacts/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })
}

export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => del(`/accounting/contacts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export function useInvoices(status?: string) {
  return useQuery({
    queryKey: ['invoices', status],
    queryFn: () => get<any[]>(`/accounting/invoices${status ? `?status=${status}` : ''}`),
  })
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () => get<any>(`/accounting/invoices/${id}`),
    enabled: !!id,
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => post('/accounting/invoices', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['accounting-stats'] })
    },
  })
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      patch(`/accounting/invoices/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['accounting-stats'] })
    },
  })
}

// ─── Payments ────────────────────────────────────────────────────────────────

export function usePayments() {
  return useQuery({ queryKey: ['payments'], queryFn: () => get<any[]>('/accounting/payments') })
}

export function useRecordPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      type: string; contactId: string; date: string; amountSen: number
      method?: string; reference?: string; notes?: string; invoiceId?: string
    }) => post('/accounting/payments', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['accounting-stats'] })
    },
  })
}
