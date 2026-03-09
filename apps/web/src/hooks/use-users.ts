'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface TenantUser {
  userId: string
  tenantId: string
  roles: string[]
  isOwner: boolean
  user: {
    id: string
    email: string
    fullName: string
    avatarUrl: string | null
    isActive: boolean
    lastLoginAt: string | null
    createdAt: string
  }
}

interface InviteResult {
  userId: string
  email: string
  isNewUser: boolean
  tempPassword?: string
  message: string
}

export function useTenantUsers() {
  return useQuery<TenantUser[]>({
    queryKey: ['tenantUsers'],
    queryFn: async () => {
      const { data } = await api.get('/tenants/users')
      return data.data
    },
  })
}

export function useInviteUser() {
  const qc = useQueryClient()
  return useMutation<InviteResult, Error, { email: string; fullName: string; roles: string[] }>({
    mutationFn: async (body) => {
      const { data } = await api.post('/users/invite', body)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenantUsers'] })
    },
  })
}

export function useUpdateUserRoles() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, { userId: string; roles: string[] }>({
    mutationFn: async ({ userId, roles }) => {
      const { data } = await api.patch(`/users/${userId}/roles`, { roles })
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenantUsers'] })
    },
  })
}

export function useRemoveUser() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: async (userId) => {
      const { data } = await api.delete(`/users/${userId}`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenantUsers'] })
    },
  })
}
