import { api } from "@/lib/api/client"
import { Recompensa } from "../recompensas/recompensas.api"

export interface ResgatarPremioDTO {
  document: string
  rewardId: number
}

export interface ResgateResponse {
  resgate: {
    id: number
    customerId: number
    rewardId: number
    pointsSpent: number
    createdAt: string
  }
  recompensa: {
    name: string
    pointsCost: number
  }
  cliente: {
    nome: string
    document: string
  }
}

export const resgatesApi = {
  resgatar: async (payload: ResgatarPremioDTO) => {
    const response = await api.post<{ success: boolean; data: ResgateResponse }>("/resgates", payload)
    return response.data
  }
}
