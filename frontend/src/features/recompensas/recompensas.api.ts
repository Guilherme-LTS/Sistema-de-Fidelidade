import { api } from "@/lib/api/client"

export interface Recompensa {
  id: number
  name: string
  description: string | null
  pointsCost: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CriarRecompensaDTO {
  name: string
  description?: string
  pointsCost: number
  isActive?: boolean
}

export const recompensasApi = {
  listar: async () => {
    const response = await api.get<{ success: boolean; data: Recompensa[] }>("/recompensas")
    return response.data
  },

  criar: async (payload: CriarRecompensaDTO) => {
    const response = await api.post<{ success: boolean; data: Recompensa }>("/recompensas", payload)
    return response.data
  },

  atualizar: async (id: number, payload: Partial<CriarRecompensaDTO>) => {
    const response = await api.put<{ success: boolean; data: Recompensa }>(`/recompensas/${id}`, payload)
    return response.data
  },

  excluir: async (id: number) => {
    const response = await api.delete<{ success: boolean }>(`/recompensas/${id}`)
    return response.success
  }
}
