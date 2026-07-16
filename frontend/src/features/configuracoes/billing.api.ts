import { api } from "@/lib/api/client"

export interface StripePlan {
  id: string
  stripePriceId: string
  amount: number
  interval: "month" | "year"
}

export async function obterPlanosDisponiveis(): Promise<StripePlan[]> {
  const response = await api.get<{ success: boolean; data: StripePlan[] }>("/billing/plans")
  return response.data
}

export interface CheckoutSessionResponse {
  url: string | null;
  alreadySubscribed?: boolean;
}

export interface PortalSessionResponse {
  url: string
}

export async function criarSessaoCheckout(priceId: string): Promise<CheckoutSessionResponse> {
  const response = await api.post<{ success: boolean; data: CheckoutSessionResponse }>("/billing/checkout", { priceId })
  return response.data
}

export async function criarSessaoPortal(): Promise<PortalSessionResponse> {
  const response = await api.post<{ success: boolean; data: PortalSessionResponse }>("/billing/portal")
  return response.data
}

export interface InvoiceItem {
  id: string
  amount: number
  status: string
  date: string | null
  pdfUrl: string | null
  receiptUrl: string | null
}

export interface UpcomingInvoiceInfo {
  amount: number
  dueDate: string | null
}

export interface SubscriptionDetailResponse {
  upcomingInvoice: UpcomingInvoiceInfo | null
  invoiceHistory: InvoiceItem[]
  subscriptionInfo?: {
    id: string
    status: string
    cancelAtPeriodEnd: boolean
    currentPeriodStart: string
    currentPeriodEnd: string
    priceId: string | null
    planAmount: number
    interval: "month" | "year"
    scheduledPlanChange: {
      priceId: string
      startDate: string
    } | null
    card: {
      brand: string
      last4: string
      expMonth: number
      expYear: number
    } | null
  } | null
}

export async function obterDetalhesAssinatura(): Promise<SubscriptionDetailResponse> {
  const response = await api.get<{ success: boolean; data: SubscriptionDetailResponse }>("/billing/subscription-details")
  return response.data
}

export async function alterarPlano(priceId: string, isUpgrade: boolean = false): Promise<{ success: boolean }> {
  const response = await api.post<{ success: boolean }>("/billing/change-plan", { priceId, isUpgrade })
  return response
}

export async function cancelarAssinatura(): Promise<{ success: boolean }> {
  const response = await api.post<{ success: boolean }>("/billing/cancel")
  return response
}

export async function reativarAssinatura(): Promise<{ success: boolean }> {
  const response = await api.post<{ success: boolean }>("/billing/resume")
  return response
}

export async function obterLinkTrocaCartao(): Promise<PortalSessionResponse> {
  const response = await api.post<{ success: boolean; data: PortalSessionResponse }>("/billing/portal-card")
  return response.data
}
