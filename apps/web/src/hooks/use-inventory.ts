import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const get = <T>(url: string) => api.get<{ data: T }>(url).then((r) => r.data.data)
const post = <T>(url: string, body: unknown) => api.post<{ data: T }>(url, body).then((r) => r.data.data)
const patch = <T>(url: string, body: unknown) => api.patch<{ data: T }>(url, body).then((r) => r.data.data)

// ─── Products ────────────────────────────────────────────────────────────────

export function useProducts(active?: boolean) {
  return useQuery({
    queryKey: ['products', active],
    queryFn: () => get<any[]>(`/inventory/products${active !== undefined ? `?isActive=${active}` : ''}`),
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => get<any>(`/inventory/products/${id}`),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string; sku?: string; barcode?: string; description?: string
      type?: string; unitOfMeasure?: string
      costPriceSen?: number; sellingPriceSen?: number
      sstType?: string; sstRate?: number
      trackInventory?: boolean; reorderPoint?: number
    }) => post('/inventory/products', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      patch(`/inventory/products/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

// ─── Warehouses ───────────────────────────────────────────────────────────────

export function useWarehouses() {
  return useQuery({ queryKey: ['warehouses'], queryFn: () => get<any[]>('/inventory/warehouses') })
}

export function useCreateWarehouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; code?: string; addressLine1?: string; city?: string; state?: string; isDefault?: boolean }) =>
      post('/inventory/warehouses', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  })
}

export function useUpdateWarehouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      patch(`/inventory/warehouses/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  })
}

// ─── Stock Movements ──────────────────────────────────────────────────────────

export function useStockMovements(productId?: string, type?: string) {
  const params = new URLSearchParams()
  if (productId) params.set('productId', productId)
  if (type) params.set('type', type)
  const qs = params.toString()
  return useQuery({
    queryKey: ['stock-movements', productId, type],
    queryFn: () => get<any[]>(`/inventory/stock${qs ? `?${qs}` : ''}`),
  })
}

export function useRecordStockMovement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      type: string; productId: string; warehouseId: string
      quantity: number; unitCostSen?: number; notes?: string; date?: string
    }) => post('/inventory/stock/movements', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

// ─── Stock Levels ─────────────────────────────────────────────────────────────

export function useStockLevels(productId?: string) {
  return useQuery({
    queryKey: ['stock-levels', productId],
    queryFn: () => get<any[]>(`/inventory/stock/${productId}`),
    enabled: productId !== undefined,
  })
}
