export interface ApiErrorResponse {
  error: string
  message?: string
}

export interface UsuarioPerfil {
  id: string
  user_id: string
  nome: string
  email: string
  role: "admin" | "operador"
  tenant_id: string
  tenant_name?: string
  tenant_logo_url?: string | null
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
