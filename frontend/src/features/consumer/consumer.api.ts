import { api } from "@/lib/api/client"

export interface ConsumerMembership {
  tenant_id: string
  tenant_name: string
  tenant_slug: string
  tenant_logo: string | null
  customer_id: string
  pontos_disponiveis: number
  pontos_pendentes: number
  pontos_expirando: number
  has_redeemable_reward?: boolean
}

export interface ConsumerDashboardData {
  profile: {
    name: string
    document: string
    email?: string
    phone?: string | null
  }
  memberships: ConsumerMembership[]
}

export async function carregarDashboardConsumer(): Promise<ConsumerDashboardData> {
  const response = await api.get<{ success: boolean; data: ConsumerDashboardData }>("/consumer/dashboard")
  return response.data
}

export async function atualizarPerfilConsumer(data: { name?: string; phone?: string; email?: string }) {
  const response = await api.put<{ success: boolean; message: string }>("/consumer/profile", data)
  return response
}

export async function solicitarRecuperacaoConsumer(identifier: string) {
  const response = await api.post<{ success: boolean; message: string }>("/public/consumer/recover-password", { identifier })
  return response
}

export interface TenantDashboardDetails {
  tenant: {
    id: string
    name: string
    tradingName: string | null
    slug: string
    logoUrl: string | null
    email: string | null
    phone: string | null
    addressLine1: string | null
    addressNumber: string | null
    addressCity: string | null
    addressState: string | null
    latitude: number | null
    longitude: number | null
    businessHours?: Record<string, { active: boolean; open: string; close: string }>
    socialLinks?: { instagram?: string; facebook?: string; tiktok?: string; website?: string }
  }
  rewards: {
    id: number
    name: string
    description: string | null
    imageUrl?: string | null
    pointsCost: number
    isActive: boolean
    createdAt: string
  }[]
  summary: {
    pontos_disponiveis: number
    total_transactions: number
    last_transaction_date: string | null
  }
}

export async function carregarTenantConsumer(slug: string): Promise<TenantDashboardDetails> {
  const response = await api.get<{ success: boolean; data: TenantDashboardDetails }>(`/consumer/tenant/${slug}`)
  return response.data
}

export interface TransactionHistoryItem {
  id: string
  type: "earn" | "spend" | "expire"
  points: number
  description: string
  createdAt: string
}

export async function carregarExtratoConsumer(slug: string): Promise<{ history: TransactionHistoryItem[] }> {
  const response = await api.get<{ success: boolean; data: { history: TransactionHistoryItem[] } }>(`/consumer/tenant/${slug}/transactions`)
  return response.data
}

export interface QuickCheckGlobalResult {
  firstName: string
  memberships: ConsumerMembership[]
}

export async function checkPointsGlobally(cpf: string): Promise<QuickCheckGlobalResult> {
  const response = await api.get<{ success: boolean; data: QuickCheckGlobalResult }>(`/public/consumer/quick-check/${cpf}`)
  return response.data
}

export interface QuickCheckTenantResult {
  tenant: {
    name: string
    logoUrl: string | null
  }
  firstName: string
  points: number
  rewards: {
    id: number
    name: string
    description: string | null
    imageUrl?: string | null
    pointsCost: number
  }[]
}

export async function checkPointsForTenant(slug: string, cpf: string): Promise<QuickCheckTenantResult> {
  const response = await api.get<{ success: boolean; data: QuickCheckTenantResult }>(`/public/tenants/${slug}/quick-check/${cpf}`)
  return response.data
}

