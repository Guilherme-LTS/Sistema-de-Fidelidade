import { api } from "@/lib/api/client"

export interface Cliente {
  id: string
  nome: string
  document: string
}

export interface ClienteDetails extends Cliente {
  pontosDisponiveis: number
  pontosPendentes: number
  pontosExpirando: number
  dataProximaExpiracao?: string
}

export interface ExtratoItem {
  data: string
  tipo: "credito" | "debito"
  descricao: string
  pontos: number
}

export interface ListarClientesInput {
  busca?: string
  page: number
  limit?: number
}

export interface ListarClientesResponse {
  clientes: Cliente[]
  total: number
  paginaAtual: number
  totalPaginas: number
}

export interface ConsultarClienteResponse {
  cliente: ClienteDetails
  extrato: ExtratoItem[]
}

export function limparCpf(cpf: string): string {
  return cpf.replace(/\D/g, "")
}

export async function listarClientes(params: ListarClientesInput): Promise<ListarClientesResponse> {
  const searchParams = new URLSearchParams()
  searchParams.set("page", params.page.toString())
  searchParams.set("limit", (params.limit || 15).toString())
  if (params.busca) {
    searchParams.set("busca", params.busca)
  }

  const response = await api.get<{ success: boolean; data: ListarClientesResponse }>(`/clientes?${searchParams.toString()}`)
  return response.data
}

export async function consultarClienteComExtrato(cpf: string): Promise<ConsultarClienteResponse> {
  const response = await api.get<{ success: boolean; data: ConsultarClienteResponse }>(`/clientes/${cpf}/saldo`)
  return response.data
}

export async function cadastrarCliente(input: { nome: string; document: string; lgpdConsentimento: boolean }): Promise<Cliente> {
  const response = await api.post<{ success: boolean; data: Cliente }>("/clientes", input)
  return response.data
}

export async function buscarClientePorCpf(cpf: string): Promise<Cliente | null> {
  const cpfLimpo = limparCpf(cpf)
  if (cpfLimpo.length !== 11) return null

  try {
    const response = await api.get<{ success: boolean; data: Cliente | null }>(`/clientes/documento/${cpfLimpo}`)
    return response.data
  } catch (error) {
    return null
  }
}
