'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface PlatformStats {
  tenantCount: number
  userCount: number
  planDistribution: { plan: string; count: number }[]
  moduleAdoption: { module: string; count: number }[]
}

interface TenantModule {
  module: string
  isActive: boolean
}

interface Tenant {
  id: string
  name: string
  slug: string
  schema: string
  plan: string
  pricingModel: string
  isActive: boolean
  createdAt: string
  _count: { users: number }
  settings: { companyName: string } | null
  modules: TenantModule[]
}

interface TenantDetail extends Omit<Tenant, 'settings'> {
  effectiveModules: string[]
  users: { roles: string[]; isOwner: boolean; user: { id: string; email: string; fullName: string; isActive: boolean; lastLoginAt: string | null } }[]
  subscription: { plan: string; status: string; billingCycle: string } | null
  settings: Record<string, unknown> | null
}

interface ModulePricing {
  id: string
  module: string
  name: string
  description: string | null
  monthlyPrice: string
  yearlyPrice: string
  isActive: boolean
  sortOrder: number
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

export function useAdminTenantDetail(id: string) {
  return useQuery<TenantDetail>({
    queryKey: ['admin', 'tenants', id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/tenants/${id}`)
      return data.data
    },
    enabled: !!id,
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

export function useUpdateTenantModules() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ tenantId, modules }: { tenantId: string; modules: { module: string; isActive: boolean }[] }) => {
      const { data } = await api.patch(`/admin/tenants/${tenantId}/modules`, { modules })
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export function useSwitchPricingModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ tenantId, model }: { tenantId: string; model: 'FLAT' | 'MODULAR' }) => {
      const { data } = await api.patch(`/admin/tenants/${tenantId}/pricing-model`, { model })
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export function useAdminModulePricing() {
  return useQuery<ModulePricing[]>({
    queryKey: ['admin', 'modules'],
    queryFn: async () => {
      const { data } = await api.get('/admin/modules')
      return data.data
    },
  })
}

export function useUpsertModulePricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ module, ...body }: { module: string; name: string; description?: string; monthlyPrice: number; yearlyPrice: number; isActive?: boolean; sortOrder?: number }) => {
      const { data } = await api.post(`/admin/modules/${module}`, body)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'modules'] })
    },
  })
}
