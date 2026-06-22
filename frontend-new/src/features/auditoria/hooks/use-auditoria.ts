import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"

export interface AuditLog {
  id: number
  tenant_id: string
  operator_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  metadata: string | null // JSON string
  status: string
  ip_address: string | null
  created_at: string
  operator?: {
    name: string
    email: string
  }
}

export interface AuditResponse {
  data: AuditLog[]
  metadata: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface AuditFilters {
  page: number
  limit: number
  action?: string
  status?: string
  startDate?: string
  endDate?: string
  q?: string
}

export function useAuditoria(filters: AuditFilters) {
  return useQuery<{ success: boolean, data: AuditLog[], metadata: any }>({
    queryKey: ['auditoria', filters],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      searchParams.set('page', filters.page.toString())
      searchParams.set('limit', filters.limit.toString())
      
      if (filters.action && filters.action !== 'ALL') searchParams.set('action', filters.action)
      if (filters.status && filters.status !== 'ALL') searchParams.set('status', filters.status)
      if (filters.startDate) searchParams.set('startDate', filters.startDate)
      if (filters.endDate) searchParams.set('endDate', filters.endDate)
      if (filters.q) searchParams.set('q', filters.q)

      return api.get(`/auditoria?${searchParams.toString()}`)
    },
    staleTime: 0,
    refetchOnMount: "always",
  })
}
