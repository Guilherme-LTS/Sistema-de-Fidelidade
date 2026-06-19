export interface ApiErrorResponse {
  error: string
  message?: string
}

export interface UsuarioPerfil {
  id: string
  user_id: string
  nome: string
  email: string
  role: string
  tenant_id: string
}

export interface RecentCliente {
  nome: string
  document: string
  saldo_pontos: number
}

export interface ChartDataItem {
  name: string
  pendentes: number
  lancados: number
  resgates: number
}

export interface DashboardStats {
  totalClientes: number
  pontosPendentes: number
  pontosDisponiveis: number
  pontosResgatados: number
  recentes: RecentCliente[]
  chartData: ChartDataItem[]
}
