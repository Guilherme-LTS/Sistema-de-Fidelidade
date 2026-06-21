import { apiRequest } from "@/lib/api/client"

export interface RestauranteInput {
  name: string
  tradingName?: string
  document?: string
  phone?: string
  email?: string
  addressLine1?: string
  addressNumber?: string
  addressCity?: string
  addressState?: string
  latitude?: string
  longitude?: string
  logoUrl?: string
}

export interface RestauranteData extends RestauranteInput {
  id: string
}

export interface UsuarioInput {
  name: string
  phone?: string
}

export interface UsuarioData extends UsuarioInput {
  id: string
  email?: string
  role: string
}

export interface FidelidadeInput {
  carenciaPontos: number
  expiracaoPontos: number
}

// APIs
export async function getRestaurante() {
  const res = await apiRequest<{ success: boolean; data: RestauranteData }>("/configuracoes/restaurante")
  return res.data
}

export async function updateRestaurante(input: RestauranteInput) {
  const res = await apiRequest<{ success: boolean; data: RestauranteData }>("/configuracoes/restaurante", {
    method: "PUT",
    body: JSON.stringify(input)
  })
  return res.data
}

export async function getUsuario() {
  const res = await apiRequest<{ success: boolean; data: UsuarioData }>("/configuracoes/usuario")
  return res.data
}

export async function updateUsuario(input: UsuarioInput) {
  const res = await apiRequest<{ success: boolean; data: UsuarioData }>("/configuracoes/usuario", {
    method: "PUT",
    body: JSON.stringify(input)
  })
  return res.data
}

export async function getFidelidade() {
  const res = await apiRequest<{ success: boolean; data: FidelidadeInput }>("/configuracoes/fidelidade")
  return res.data
}

export async function updateFidelidade(input: FidelidadeInput) {
  const res = await apiRequest<{ success: boolean; data: FidelidadeInput }>("/configuracoes/fidelidade", {
    method: "PUT",
    body: JSON.stringify(input)
  })
  return res.data
}
