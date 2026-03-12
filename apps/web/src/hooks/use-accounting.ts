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

export function useCreateCreditNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, ...data }: { invoiceId: string; reason: string; lines: any[] }) =>
      post(`/accounting/invoices/${invoiceId}/credit-note`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['accounting-stats'] })
    },
  })
}

export function useCreateDebitNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, ...data }: { invoiceId: string; reason: string; lines: any[] }) =>
      post(`/accounting/invoices/${invoiceId}/debit-note`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
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

// ─── Journal Entries ─────────────────────────────────────────────────────────

export function useJournals(status?: string) {
  return useQuery({
    queryKey: ['journals', status],
    queryFn: () => get<any[]>(`/accounting/journals${status ? `?status=${status}` : ''}`),
  })
}

export function useJournal(id: string) {
  return useQuery({
    queryKey: ['journals', id],
    queryFn: () => get<any>(`/accounting/journals/${id}`),
    enabled: !!id,
  })
}

export function useCreateJournal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      date: string; description: string; source?: string; referenceId?: string
      lines: { accountId: string; description?: string; debitSen: number; creditSen: number }[]
    }) => post('/accounting/journals', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journals'] }),
  })
}

export function usePostJournal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => post(`/accounting/journals/${id}/post`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journals'] }),
  })
}

export function useReverseJournal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => post(`/accounting/journals/${id}/reverse`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journals'] }),
  })
}

export function useDeleteJournal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => del(`/accounting/journals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journals'] }),
  })
}

// ─── Bills (Accounts Payable) ────────────────────────────────────────────────

export function useBills(status?: string) {
  return useQuery({
    queryKey: ['bills', status],
    queryFn: () => get<any[]>(`/accounting/bills${status ? `?status=${status}` : ''}`),
  })
}

export function useBill(id: string) {
  return useQuery({
    queryKey: ['bills', id],
    queryFn: () => get<any>(`/accounting/bills/${id}`),
    enabled: !!id,
  })
}

export function useCreateBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      contactId: string; billDate: string; dueDate?: string; currency?: string
      notes?: string; lines: { description: string; quantity: number; unitPriceSen: number; discountPercent?: number; sstRate?: number; accountId?: string }[]
    }) => post('/accounting/bills', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      qc.invalidateQueries({ queryKey: ['accounting-stats'] })
    },
  })
}

export function useApproveBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => patch(`/accounting/bills/${id}/approve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bills'] }),
  })
}

export function usePayBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; amountSen: number; date: string; method?: string; reference?: string }) =>
      post(`/accounting/bills/${id}/pay`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['accounting-stats'] })
    },
  })
}

export function useUpdateBillStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      patch(`/accounting/bills/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bills'] }),
  })
}

export function useDeleteBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => del(`/accounting/bills/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bills'] }),
  })
}

// ─── Financial Reports ───────────────────────────────────────────────────────

export function useTrialBalance(asOfDate: string) {
  return useQuery({
    queryKey: ['report-trial-balance', asOfDate],
    queryFn: () => get<any>(`/accounting/reports/trial-balance?asOfDate=${asOfDate}`),
    enabled: !!asOfDate,
  })
}

export function useProfitAndLoss(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['report-pnl', startDate, endDate],
    queryFn: () => get<any>(`/accounting/reports/profit-loss?startDate=${startDate}&endDate=${endDate}`),
    enabled: !!startDate && !!endDate,
  })
}

export function useBalanceSheet(asOfDate: string) {
  return useQuery({
    queryKey: ['report-bs', asOfDate],
    queryFn: () => get<any>(`/accounting/reports/balance-sheet?asOfDate=${asOfDate}`),
    enabled: !!asOfDate,
  })
}

export function useCashFlow(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['report-cashflow', startDate, endDate],
    queryFn: () => get<any>(`/accounting/reports/cash-flow?startDate=${startDate}&endDate=${endDate}`),
    enabled: !!startDate && !!endDate,
  })
}

export function useAPAging() {
  return useQuery({
    queryKey: ['report-ap-aging'],
    queryFn: () => get<any>('/accounting/reports/ap-aging'),
  })
}

export function useARAging() {
  return useQuery({
    queryKey: ['report-ar-aging'],
    queryFn: () => get<any>('/accounting/reports/ar-aging'),
  })
}

// ─── Banking ─────────────────────────────────────────────────────────────────

export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => get<any[]>('/accounting/banking/accounts'),
  })
}

export function useBankAccount(id: string) {
  return useQuery({
    queryKey: ['bank-accounts', id],
    queryFn: () => get<any>(`/accounting/banking/accounts/${id}`),
    enabled: !!id,
  })
}

export function useCreateBankAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      bankName: string; accountName: string; accountNumber: string; accountType?: string
      currency?: string; openingBalanceSen?: number; accountId?: string
    }) => post('/accounting/banking/accounts', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-accounts'] }),
  })
}

export function useUpdateBankAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      patch(`/accounting/banking/accounts/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-accounts'] }),
  })
}

export function useDeleteBankAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => del(`/accounting/banking/accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-accounts'] }),
  })
}

export function useBankTransactions(bankAccountId: string, startDate?: string, endDate?: string) {
  const params = new URLSearchParams()
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  const qs = params.toString()
  return useQuery({
    queryKey: ['bank-transactions', bankAccountId, startDate, endDate],
    queryFn: () => get<any[]>(`/accounting/banking/transactions/${bankAccountId}${qs ? `?${qs}` : ''}`),
    enabled: !!bankAccountId,
  })
}

export function useCreateBankTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      bankAccountId: string; date: string; description: string; type: string; amountSen: number; reference?: string
    }) => post('/accounting/banking/transactions', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-transactions'] })
      qc.invalidateQueries({ queryKey: ['bank-accounts'] })
    },
  })
}

export function useImportBankTransactions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ bankAccountId, transactions }: { bankAccountId: string; transactions: any[] }) =>
      post(`/accounting/banking/transactions/${bankAccountId}/import`, { transactions }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-transactions'] })
      qc.invalidateQueries({ queryKey: ['bank-accounts'] })
    },
  })
}

export function useMatchBankTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, paymentId }: { id: string; paymentId: string }) =>
      post(`/accounting/banking/transactions/${id}/match`, { paymentId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-transactions'] }),
  })
}

export function useUnmatchBankTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => post(`/accounting/banking/transactions/${id}/unmatch`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-transactions'] }),
  })
}

export function useUnreconciledItems(bankAccountId: string) {
  return useQuery({
    queryKey: ['unreconciled', bankAccountId],
    queryFn: () => get<any>(`/accounting/banking/reconcile/${bankAccountId}`),
    enabled: !!bankAccountId,
  })
}

export function useStartReconSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      bankAccountId: string; statementDate: string; statementBalanceSen: number; matchedTransactionIds: string[]
    }) => post('/accounting/banking/reconcile', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-transactions'] })
      qc.invalidateQueries({ queryKey: ['unreconciled'] })
    },
  })
}

export function useCompleteReconSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => post(`/accounting/banking/reconcile/${id}/complete`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-transactions'] })
      qc.invalidateQueries({ queryKey: ['unreconciled'] })
    },
  })
}

// ─── Tax Codes ───────────────────────────────────────────────────────────────

export function useTaxCodes() {
  return useQuery({
    queryKey: ['tax-codes'],
    queryFn: () => get<any[]>('/accounting/tax/codes'),
  })
}

export function useActiveTaxCodes(date?: string) {
  return useQuery({
    queryKey: ['tax-codes-active', date],
    queryFn: () => get<any[]>(`/accounting/tax/codes/active${date ? `?date=${date}` : ''}`),
  })
}

export function useCreateTaxCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      code: string; name: string; taxType: string; rate: number; category?: string
      effectiveFrom: string; effectiveTo?: string
    }) => post('/accounting/tax/codes', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tax-codes'] }),
  })
}

export function useUpdateTaxCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      patch(`/accounting/tax/codes/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tax-codes'] }),
  })
}

export function useDeleteTaxCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => del(`/accounting/tax/codes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tax-codes'] }),
  })
}

export function useSeedTaxCodes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => post('/accounting/tax/seed', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tax-codes'] }),
  })
}

// ─── Compliance ──────────────────────────────────────────────────────────────

export function useComplianceObligations(year?: number, month?: number, status?: string) {
  const params = new URLSearchParams()
  if (year) params.set('year', String(year))
  if (month) params.set('month', String(month))
  if (status) params.set('status', status)
  const qs = params.toString()
  return useQuery({
    queryKey: ['compliance-obligations', year, month, status],
    queryFn: () => get<any[]>(`/accounting/compliance/obligations${qs ? `?${qs}` : ''}`),
  })
}

export function useCreateComplianceObligation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      obligationType: string; description: string; dueDate: string; periodYear: number; periodMonth?: number
    }) => post('/accounting/compliance/obligations', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance-obligations'] }),
  })
}

export function useCompleteComplianceObligation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => patch(`/accounting/compliance/obligations/${id}/complete`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-obligations'] })
      qc.invalidateQueries({ queryKey: ['compliance-dashboard'] })
    },
  })
}

export function useGenerateMonthlyObligations() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { year: number; month: number }) =>
      post('/accounting/compliance/generate-monthly', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance-obligations'] }),
  })
}

export function useGenerateAnnualObligations() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { year: number; incorporationDate: string; fyeMonth: number }) =>
      post('/accounting/compliance/generate-annual', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance-obligations'] }),
  })
}

export function useComplianceDashboard() {
  return useQuery({
    queryKey: ['compliance-dashboard'],
    queryFn: () => get<any>('/accounting/compliance/dashboard'),
  })
}
