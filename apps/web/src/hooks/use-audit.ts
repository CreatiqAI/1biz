'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface AuditLogEntry {
  id: string
  user_id: string
  user_email: string
  user_name: string | null
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

interface AuditLogsResponse {
  rows: AuditLogEntry[]
  total: number
  limit: number
  offset: number
}

export function useAuditLogs(opts: { limit?: number; offset?: number; entityType?: string }) {
  return useQuery<AuditLogsResponse>({
    queryKey: ['auditLogs', opts],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (opts.limit) params.set('limit', String(opts.limit))
      if (opts.offset) params.set('offset', String(opts.offset))
      if (opts.entityType) params.set('entityType', opts.entityType)
      const { data } = await api.get(`/audit/logs?${params.toString()}`)
      return data.data
    },
    refetchInterval: 30000, // refresh every 30s
  })
}
