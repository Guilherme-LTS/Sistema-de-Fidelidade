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
