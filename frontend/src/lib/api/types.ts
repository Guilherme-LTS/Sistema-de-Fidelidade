export interface ApiErrorResponse {
  error: string
  message?: string
}

export interface UsuarioPerfil {
  id: string
  user_id: string
  nome: string
  email: string
  role: "admin" | "operador" | "novato"
  tenant_id: string
  tenant_name?: string
  tenant_logo_url?: string | null
  subscription_status?: string | null
  subscription_current_period_end?: string | null
  subscription_price_id?: string | null
  cancel_at_period_end?: boolean
  plan_name?: "Trial" | "Pro" | "Bloqueado"
  allow_custom_regulation?: boolean
  trial_onboarding_shown?: boolean
  usage?: {
    operators: number
    max_operators: number
    customers: number
    max_customers: number
  }
}

export interface RecentActivity {
  id: number
  action: string
  createdAt: string
  metadata: string
}

export interface ChartDataItem {
  date: string
  emitidos: number
  resgatados: number
  expirados: number
}

export interface TopCustomer {
  id: number
  nome: string
  saldo: number
}

export interface DashboardStats {
  clientes: {
    total: number
    novosMes: number
    crescimento: number
  }
  pontos: {
    emitidos: number
    emitidosCrescimento: number
    resgatados: number
    resgatadosCrescimento: number
    expirados: number
    expiradosCrescimento: number
    saldoCirculante: number
    expirandoEmBreve: number
  }
  recompensas: {
    favorita: string | null
    topRecompensas: Array<{ name: string; resgates: number }>
    resgatesMes: number
  }
  topClientes: TopCustomer[]
  atividades: RecentActivity[]
  chartData: ChartDataItem[]
}
