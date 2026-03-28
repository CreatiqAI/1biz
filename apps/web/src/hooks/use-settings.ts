import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const get = <T>(url: string) => api.get<{ data: T }>(url).then((r) => r.data.data)
const patch = <T>(url: string, body: unknown) => api.patch<{ data: T }>(url, body).then((r) => r.data.data)

export function useTenantSettings() {
  return useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => get<any>('/tenants/settings'),
  })
}

export function useUpdateTenantSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => patch('/tenants/settings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-settings'] }),
  })
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (data: { password: string; confirmation: string }) =>
      api.delete('/auth/account', { data }).then((r) => r.data),
  })
}
