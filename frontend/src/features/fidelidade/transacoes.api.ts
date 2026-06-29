import { api } from "@/lib/api/client"

export interface LancarPontosInput {
  document: string
  valor: number
  nome?: string
}

export interface LancarPontosResponse {
  pontosGanhos: number
  cliente: {
    id: number
    nome: string | null
    document: string
  }
}

export async function lancarPontos(input: LancarPontosInput): Promise<LancarPontosResponse> {
  const response = await api.post<{ success: boolean; data: LancarPontosResponse }>("/transacoes", input)
  return response.data
}
