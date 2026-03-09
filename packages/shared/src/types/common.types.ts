// Pagination
export interface PaginationQuery {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  errors?: Record<string, string[]>
}

// Audit fields (every entity has these)
export interface AuditFields {
  createdAt: string
  updatedAt: string
  createdById?: string
  updatedById?: string
  deletedAt?: string | null
}

// Money — always in sen (smallest MYR unit, like cents)
// e.g., RM 100.50 = 10050 sen
export type Money = number

// Helper
export function ringgitToSen(ringgit: number): Money {
  return Math.round(ringgit * 100)
}

export function senToRinggit(sen: Money): number {
  return sen / 100
}

export function formatRinggit(sen: Money): string {
  return `RM ${(sen / 100).toFixed(2)}`
}
