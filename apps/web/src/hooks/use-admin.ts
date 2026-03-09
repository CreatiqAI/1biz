'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface PlatformStats {
  tenantCount: number
  userCount: number
  planDistribution: { plan: string; count: number }[]
}

interface Tenant {
  id: string
  name: string
  slug: string
  schema: string
  plan: string
  isActive: boolean
  createdAt: string
  _count: { users: number }
  settings: { companyName: string } | null
}

export function useAdminStats() {
  return useQuery<PlatformStats>({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/stats')
      return data.data
    },
  })
}

export function useAdminTenants() {
  return useQuery<Tenant[]>({
    queryKey: ['admin', 'tenants'],
    queryFn: async () => {
      const { data } = await api.get('/admin/tenants')
      return data.data
    },
  })
}

export function useToggleTenantActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tenantId: string) => {
      const { data } = await api.patch(`/admin/tenants/${tenantId}/toggle-active`)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}
