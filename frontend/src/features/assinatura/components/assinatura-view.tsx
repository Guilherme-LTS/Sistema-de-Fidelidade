"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  criarSessaoCheckout,
  obterDetalhesAssinatura,
  alterarPlano,
  cancelarAssinatura,
  reativarAssinatura,
  obterLinkTrocaCartao,
  obterPlanosDisponiveis,
} from "@/features/configuracoes/billing.api"
import { toast } from "sonner"
import {
  Check,
  CreditCard,
  Calendar,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Users,
  UsersRound,
  Download,
  AlertCircle,
  Clock,
  HelpCircle,
  CalendarClock
} from "lucide-react"
import { CheckoutSuccessModal } from "@/features/configuracoes/components/checkout-success-modal"
import { UsageProgress } from "./usage-progress"
import { syncBillingState } from "@/features/configuracoes/utils/billing-sync"
import { useBillingState } from "../hooks/use-billing-state"

export function AssinaturaView() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [loadingPrice, setLoadingPrice] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<"mensal" | "anual">("mensal")
  const [planChangeConfirm, setPlanChangeConfirm] = useState<{ planKey: string; isUpgrade: boolean } | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Sincronizar montagem para evitar erro de hidratação
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Buscar detalhes de faturamento diretamente da Stripe no backend
  const { data: details, isLoading: isLoadingDetails, refetch: refetchDetails } = useQuery({
    queryKey: ["billing-details"],
    queryFn: obterDetalhesAssinatura,
    enabled: !!user?.tenant_id,
  })

  // Buscar os preços reais (dinâmicos) da Stripe
  const { data: plansData, isLoading: isLoadingPlans } = useQuery({
    queryKey: ["billing-plans"],
    queryFn: obterPlanosDisponiveis,
  })

  // Extrair os preços reais vindos da API, com fallback visual temporário
  const proMensalPlan = plansData?.find((p) => p.id === "pro_mensal")
  const proAnualPlan = plansData?.find((p) => p.id === "pro_anual")

  const precoMensal = proMensalPlan ? (proMensalPlan.amount / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "99,00"
  const precoAnual = proAnualPlan ? (proAnualPlan.amount / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "948,00"

  // Determinar de forma resiliente o intervalo do plano ativo ou agendado ("month" | "year")
  const activeInterval: "month" | "year" | null = (() => {
    if (details?.subscriptionInfo?.interval) {
      return details.subscriptionInfo.interval
    }
    if (user?.subscription_price_id) {
      if (proAnualPlan && user.subscription_price_id === proAnualPlan.stripePriceId) return "year"
      if (proMensalPlan && user.subscription_price_id === proMensalPlan.stripePriceId) return "month"
      if (user.subscription_price_id.includes("anual")) return "year"
      if (user.subscription_price_id.includes("mensal")) return "month"
    }
    return null
  })()

  // Sincronizar o ciclo visual do toggle com a assinatura ativa ou agendada
  useEffect(() => {
    if (activeInterval) {
      setBillingCycle(activeInterval === "year" ? "anual" : "mensal")
    }
  }, [activeInterval])

  // Sincronizar o perfil do usuário caso a Stripe tenha alterado o status (JIT Sync autocicatrização)
  useEffect(() => {
    if (user && details?.subscriptionInfo) {
      const apiStatus = details.subscriptionInfo.status
      const apiCancelAtPeriodEnd = details.subscriptionInfo.cancelAtPeriodEnd ?? false
      
      const dbStatus = user.subscription_status
      const dbCancelAtPeriodEnd = user.cancel_at_period_end ?? false

      if (apiStatus !== dbStatus || apiCancelAtPeriodEnd !== dbCancelAtPeriodEnd) {
        queryClient.invalidateQueries({ queryKey: ["auth-profile"] })
      }
    }
  }, [details, user, queryClient])

  if (!user || !isMounted) return null

  const { status, isTrial, isPro, isLocked, willCancelAtPeriodEnd, trialDaysLeft } = useBillingState(user)

  const isPastDue = status === "past_due"
  const isExpired = status === "expired"
  const trialExpired = isTrial && trialDaysLeft <= 0
  
  const hasStripeSubscription = !!details?.subscriptionInfo || !!user.subscription_price_id
  const hasActiveStripeSubscription =
    (!!details?.subscriptionInfo && details.subscriptionInfo.status !== "canceled") ||
    (status === "trial_scheduled" || status === "trial_canceled" || status === "active" || status === "canceled")
  
  const pendingInvoice = details?.invoiceHistory?.find((inv) => inv.status === "open")

  const handleSubscribe = async (planKey: string) => {
    setLoadingPrice(planKey)
    try {
      const response = await criarSessaoCheckout(planKey)
      
      if (response.alreadySubscribed) {
        toast.success("Sua assinatura foi sincronizada com sucesso!")
        await syncBillingState(queryClient)
        return
      }
      
      if (response.url) {
        window.location.href = response.url
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar checkout")
    } finally {
      setLoadingPrice(null)
    }
  }

  const handlePlanChangeClick = (planKey: string) => {
    setPlanChangeConfirm({ planKey, isUpgrade: true })
  }

  const handleAlterarPlano = async () => {
    if (!planChangeConfirm) return
    const { planKey } = planChangeConfirm
    setLoadingPrice(planKey)
    setPlanChangeConfirm(null)
    try {
      await alterarPlano(planKey, true)
      toast.success("Ciclo de faturamento atualizado com sucesso!")
      await syncBillingState(queryClient)
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar ciclo")
    } finally {
      setLoadingPrice(null)
    }
  }

  const handleUpdateCard = async () => {
    setLoadingAction("card")
    try {
      const { url } = await obterLinkTrocaCartao()
      window.location.href = url
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar link de alteração de cartão")
    } finally {
      setLoadingAction(null)
    }
  }

  const handleCancelSubscription = async () => {
    setLoadingAction("cancel")
    try {
      await cancelarAssinatura()
      toast.success("Cancelamento agendado com sucesso.")
      await syncBillingState(queryClient)
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar assinatura")
    } finally {
      setLoadingAction(null)
    }
  }

  const handleResumeSubscription = async () => {
    setLoadingAction("resume")
    try {
      await reativarAssinatura()
      toast.success("Sua assinatura foi reativada com sucesso!")
      await syncBillingState(queryClient)
    } catch (err: any) {
      toast.error(err.message || "Erro ao reativar assinatura")
    } finally {
      setLoadingAction(null)
    }
  }

  const formatCurrency = (amountInCents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amountInCents / 100)
  }

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "-"
    return new Date(isoString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const currentStripePriceId = user.subscription_price_id
  const isProPrice = !!currentStripePriceId

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* HEADER PRINCIPAL */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Faturamento & Assinatura</h2>
        <p className="text-muted-foreground text-sm">
          Gerencie seu plano, métodos de pagamento e histórico financeiro.
        </p>
      </div>

      {/* ALERTAS */}
      {isPastDue && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">Pendência de Pagamento</h4>
              <p className="text-xs">
                Ocorreu uma falha ao processar a cobrança do seu plano. Atualize seus dados financeiros ou regularize o pagamento da fatura em aberto.
              </p>
            </div>
          </div>
          {pendingInvoice?.receiptUrl && (
            <a
              href={pendingInvoice.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shrink-0 shadow-sm"
            >
              <CreditCard className="w-4 h-4" />
              Pagar Fatura ({formatCurrency(pendingInvoice.amount)})
            </a>
          )}
        </div>
      )}

      {isExpired && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-sm">Acesso Suspenso</h4>
            <p className="text-xs">
              Sua assinatura está inativa ou seu período de teste grátis terminou. Ative seu plano Pro abaixo para liberar o acesso ao sistema.
            </p>
          </div>
        </div>
      )}

      {/* SEÇÃO 1: SEU PLANO (Current Plan & Usage) */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-foreground tracking-tight">Seu Plano</h3>
        <Card className="border-border/60 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <CardHeader className="pb-4 border-b bg-muted/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-extrabold flex items-center gap-2">
                  {user.plan_name ? `Plano ${user.plan_name}` : "Plano Inativo"}
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                      status === "active"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : status === "canceled" || status === "trial_canceled"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        : status === "trial_active" || status === "trial_scheduled"
                        ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                        : "bg-red-500/10 text-red-600 border-red-500/20"
                    }`}
                  >
                    {status === "active"
                      ? "Ativo" 
                      : status === "canceled"
                      ? "Cancelamento Agendado"
                      : status === "trial_canceled"
                      ? "Agendamento Cancelado"
                      : status === "trial_scheduled" 
                      ? "Assinatura Agendada"
                      : status === "trial_active"
                      ? "Trial"
                      : "Inativo"}
                  </span>
                </CardTitle>
                <CardDescription className="mt-1 flex items-center gap-2 text-xs">
                  {hasActiveStripeSubscription ? (
                    <>
                      {details?.subscriptionInfo?.interval === "year" ? "Faturamento Anual" : "Faturamento Mensal"}
                      <span className="text-muted-foreground/50">•</span>
                      {status === "trial_scheduled" ? (
                        <span>Primeira cobrança em <strong>{details?.upcomingInvoice ? formatDate(details.upcomingInvoice.dueDate) : formatDate(details?.subscriptionInfo?.currentPeriodEnd || user.subscription_current_period_end)}</strong></span>
                      ) : status === "trial_canceled" || status === "canceled" ? (
                        <span>Encerramento do acesso em <strong>{formatDate(details?.subscriptionInfo?.currentPeriodEnd || user.subscription_current_period_end)}</strong></span>
                      ) : (
                        <span>Próxima cobrança em <strong>{details?.upcomingInvoice ? formatDate(details.upcomingInvoice.dueDate) : formatDate(details?.subscriptionInfo?.currentPeriodEnd)}</strong></span>
                      )}
                    </>
                  ) : status === "trial_active" ? (
                    <span>Período de testes gratuito expira em <strong>{formatDate(user.subscription_current_period_end)}</strong></span>
                  ) : (
                    <span>Sua conta está inativa. Escolha um plano abaixo para reativar seu programa de fidelidade.</span>
                  )}
                </CardDescription>
              </div>
              
              {(status === "active" || status === "trial_scheduled" || status === "canceled" || status === "trial_canceled") && (
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-foreground">
                    {status === "canceled" || status === "trial_canceled"
                      ? "R$ 0,00"
                      : status === "trial_scheduled" && details?.subscriptionInfo?.planAmount
                      ? formatCurrency(details.subscriptionInfo.planAmount)
                      : details?.upcomingInvoice
                      ? formatCurrency(details.upcomingInvoice.amount)
                      : "R$ 0,00"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {status === "trial_scheduled" ? "Valor previsto" : status === "trial_canceled" || status === "canceled" ? "Sem cobranças futuras" : "Próxima fatura"}
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            
            {/* ALERT DE ASSINATURA AGENDADA (TRIAL COM CARTÃO) */}
            {status === "trial_scheduled" && details?.subscriptionInfo && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex gap-3">
                <CalendarClock className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm text-emerald-800 dark:text-emerald-300">
                  <h4 className="font-semibold">Assinatura Agendada com Sucesso!</h4>
                  <p>
                    Você garantiu a contratação do <strong>Plano Pro ({details.subscriptionInfo.interval === "year" ? "Anual" : "Mensal"})</strong>.
                  </p>
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                    Seu período gratuito de testes continua ativo até o dia <strong>{formatDate(user.subscription_current_period_end)}</strong>. A primeira cobrança de <strong>{details.subscriptionInfo.planAmount ? formatCurrency(details.subscriptionInfo.planAmount) : details.subscriptionInfo.interval === "year" ? `R$ ${precoAnual}` : `R$ ${precoMensal}`}</strong> ocorrerá de forma 100% automática apenas quando o trial expirar, mantendo seu acesso liberado.
                  </p>
                </div>
              </div>
            )}

            {/* ALERT DE AGENDAMENTO CANCELADO (TRIAL_CANCELED) */}
            {status === "trial_canceled" && details?.subscriptionInfo && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
                  <h4 className="font-semibold">Agendamento Cancelado</h4>
                  <p>
                    Seu agendamento do <strong>Plano Pro ({details.subscriptionInfo.interval === "year" ? "Anual" : "Mensal"})</strong> foi cancelado.
                  </p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                    Seu período gratuito de testes continua ativo até o dia <strong>{formatDate(user.subscription_current_period_end)}</strong> e <strong>nenhuma cobrança será feita</strong>. Você perderá o acesso às funcionalidades Pro após esta data caso não reative o agendamento.
                  </p>
                </div>
              </div>
            )}

            {/* ALERT DE CANCELAMENTO AGENDADO (ASSINATURA CANCELED MAS ATIVA) */}
            {status === "canceled" && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-3">
                <CalendarClock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
                  <h4 className="font-semibold">Cancelamento Agendado</h4>
                  <p>
                    Sua assinatura do <strong>Plano Pontus Pro</strong> foi cancelada e <strong>não será renovada</strong>.
                  </p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                    Você continuará com acesso total a todas as funcionalidades Pro e seus dados estão 100% seguros até o dia <strong>{formatDate(details?.subscriptionInfo?.currentPeriodEnd || user.subscription_current_period_end)}</strong>. Nenhuma nova cobrança será realizada após essa data.
                  </p>
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResumeSubscription}
                      disabled={loadingAction === "resume"}
                      className="border-amber-500/30 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-semibold h-8 bg-transparent"
                    >
                      {loadingAction === "resume" ? <RefreshCw className="h-3 w-3 animate-spin mr-1.5" /> : <Sparkles className="h-3 w-3 mr-1.5" />}
                      Reativar Assinatura (Manter Acesso Pro)
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* BARRAS DE CONSUMO */}
            {user.usage && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <UsageProgress 
                  label="Clientes Cadastrados"
                  icon={<Users className="w-4 h-4" />}
                  current={user.usage.customers}
                  max={user.usage.max_customers}
                  isSuspended={isLocked}
                />
                <UsageProgress 
                  label="Operadores (Equipe)"
                  icon={<UsersRound className="w-4 h-4" />}
                  current={user.usage.operators}
                  max={user.usage.max_operators}
                  isSuspended={isLocked}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SEÇÃO 2: FATURAMENTO & PAGAMENTO */}
      {(hasStripeSubscription || (details?.invoiceHistory && details.invoiceHistory.length > 0)) && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground tracking-tight">Pagamento & Faturas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* MÉTODO DE PAGAMENTO */}
            {details?.subscriptionInfo && (
              <Card className="border-border/60 md:col-span-1 h-fit shadow-sm">
                <CardHeader className="pb-4 border-b bg-muted/10">
                  <CardTitle className="text-sm font-semibold text-foreground">Método de Pagamento</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {details.subscriptionInfo.card ? (
                    <div className="flex items-center gap-3">
                      <div className="bg-muted p-2 rounded-lg border">
                        <CreditCard className="h-6 w-6 text-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wide">{details.subscriptionInfo.card.brand} •••• {details.subscriptionInfo.card.last4}</p>
                        <p className="text-xs text-muted-foreground">Expira em {details.subscriptionInfo.card.expMonth}/{details.subscriptionInfo.card.expYear}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado.</p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUpdateCard}
                    disabled={loadingAction === "card"}
                    className="w-full text-xs font-semibold"
                  >
                    {loadingAction === "card" ? <RefreshCw className="h-3 w-3 animate-spin mr-2" /> : <CreditCard className="h-3 w-3 mr-2" />}
                    Alterar Cartão
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* HISTÓRICO DE FATURAS */}
            <Card className={`border-border/60 shadow-sm ${details?.subscriptionInfo ? 'md:col-span-2' : 'md:col-span-3'}`}>
              <CardHeader className="pb-4 border-b bg-muted/10">
                <CardTitle className="text-sm font-semibold text-foreground">Histórico de Faturas</CardTitle>
              </CardHeader>
              <div className="p-0">
                {details?.invoiceHistory && details.invoiceHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-muted/30 text-xs text-muted-foreground">
                        <tr>
                          <th className="py-3 px-4 font-medium">Data</th>
                          <th className="py-3 px-4 font-medium">Valor</th>
                          <th className="py-3 px-4 font-medium">Status</th>
                          <th className="py-3 px-4 font-medium text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y border-t">
                        {details.invoiceHistory.map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-muted/10 transition-colors">
                            <td className="py-3 px-4 text-foreground">{formatDate(invoice.date)}</td>
                            <td className="py-3 px-4 font-medium text-foreground">{formatCurrency(invoice.amount)}</td>
                            <td className="py-3 px-4">
                              {(() => {
                                switch (invoice.status) {
                                  case "paid":
                                    return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Pago</span>
                                  case "open":
                                    return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20">Pendente</span>
                                  case "uncollectible":
                                    return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-600 border border-red-500/20">Inadimplente</span>
                                  case "void":
                                    return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20">Cancelada</span>
                                  default:
                                    return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">{invoice.status}</span>
                                }
                              })()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {invoice.status === "open" ? (
                                invoice.receiptUrl ? (
                                  <a
                                    href={invoice.receiptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                                  >
                                    <CreditCard className="w-3.5 h-3.5" />
                                    Pagar Fatura
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )
                              ) : invoice.status === "paid" ? (
                                invoice.pdfUrl || invoice.receiptUrl ? (
                                  <a
                                    href={invoice.pdfUrl || invoice.receiptUrl || "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    Baixar
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Nenhuma fatura encontrada.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
      {/* SEÇÃO 3: PLANOS DISPONÍVEIS */}
      <div className="space-y-6 pt-6 border-t border-border/60">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-foreground tracking-tight">Assinatura Pontus</h3>
          
          {/* SWITCH DE CICLO DE COBRANÇA */}
          <div className="bg-muted/50 p-1 rounded-xl border flex items-center gap-1">
            <button
              onClick={() => setBillingCycle("mensal")}
              className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
                billingCycle === "mensal"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Faturamento Mensal
            </button>
            <button
              onClick={() => setBillingCycle("anual")}
              className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                billingCycle === "anual"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Faturamento Anual
              <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                Economize 20%
              </span>
            </button>
          </div>
        </div>

        {/* PRICING GRID (Plano Único Pro Centralizado) */}
        <div className="flex justify-center">
          <Card className={`w-full max-w-xl flex flex-col relative overflow-hidden border-primary/40 shadow-md transition-all hover:border-primary/60 hover:shadow-lg bg-primary/5`}>
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg flex items-center gap-1">
              <Sparkles className="h-3 w-3 fill-primary-foreground" /> Plano Completo
            </div>
            <CardHeader className="space-y-2">
              <CardTitle className="text-xl font-bold flex items-center gap-1.5">
                Pontus Pro
              </CardTitle>
              <CardDescription>Acesso total a todas as funcionalidades do sistema para alavancar suas vendas.</CardDescription>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-3xl font-bold tracking-tight text-foreground">R$ {billingCycle === "mensal" ? precoMensal : precoAnual}</span>
                    <span className="text-sm font-medium text-muted-foreground">/{billingCycle === "mensal" ? "mês" : "ano"}</span>
                  </div>
              <div className="h-4">
                {billingCycle === "anual" && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    Faturado anualmente (R$ {precoAnual}/ano)
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Clientes cadastrados <strong>ilimitados</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Até <strong>10 operadores/atendentes ativos</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Catálogo de prêmios com imagens</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Regulamento oficial customizável</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Relatórios e métricas de fidelização completas</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              {hasActiveStripeSubscription ? (
                (() => {
                  const isCurrent = activeInterval === (billingCycle === "mensal" ? "month" : "year");
                  const isTrialing = status === "trial_scheduled";
                  const isTrialCanceled = status === "trial_canceled";
                  
                  return (
                    <Button
                      className="w-full font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm"
                      disabled={isCurrent && !isTrialCanceled && status !== "canceled" ? true : loadingPrice !== null || loadingAction !== null}
                      onClick={() => {
                        if ((isTrialCanceled || status === "canceled") && isCurrent) {
                          handleResumeSubscription();
                        } else {
                          handlePlanChangeClick(billingCycle === "mensal" ? "pro_mensal" : "pro_anual")
                        }
                      }}
                    >
                      {loadingPrice === (billingCycle === "mensal" ? "pro_mensal" : "pro_anual") || loadingAction === "resume" ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (isTrialCanceled || status === "canceled") && isCurrent ? (
                        "Reativar Assinatura 🚀"
                      ) : (isTrialCanceled || status === "canceled") && !isCurrent ? (
                        billingCycle === "anual" ? "Assinar Plano Anual 🚀" : "Assinar Plano Mensal 🚀"
                      ) : isCurrent ? (
                        isTrialing ? "Plano Agendado" : "Plano Atual"
                      ) : isTrialing ? (
                        billingCycle === "anual" ? "Mudar Agendamento para Anual 🚀" : "Mudar Agendamento para Mensal 🚀"
                      ) : (
                        billingCycle === "anual" ? "Mudar para Ciclo Anual (Economize 20%)" : "Mudar para Ciclo Mensal"
                      )}
                    </Button>
                  )
                })()
              ) : (
                <Button
                  className="w-full font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm"
                  disabled={loadingPrice !== null}
                  onClick={() => handleSubscribe(billingCycle === "mensal" ? "pro_mensal" : "pro_anual")}
                >
                  {loadingPrice === (billingCycle === "mensal" ? "pro_mensal" : "pro_anual") ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : status === "trial_active" ? (
                    "Assinar Plano Pro (Cobrado após o Trial)"
                  ) : (
                    "Assinar Plano Pro"
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* SEÇÃO 4: DANGER ZONE */}
      {hasActiveStripeSubscription && (
        <div className="space-y-4 pt-12">
          <h3 className="text-lg font-bold text-red-600 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Zona de Perigo
          </h3>
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10 dark:border-red-900/50">
            <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-6">
              <div className="space-y-1">
                <h4 className="font-semibold text-foreground">
                  {status === "trial_scheduled" || status === "trial_canceled" ? "Agendamento" : "Assinatura"}
                </h4>
                {willCancelAtPeriodEnd ? (
                  <p className="text-sm text-muted-foreground">
                    {status === "trial_canceled" 
                      ? `Seu agendamento foi cancelado. Seu acesso gratuito expira em ${formatDate(details?.subscriptionInfo?.currentPeriodEnd || user.subscription_current_period_end)}.`
                      : `Sua assinatura já está programada para ser encerrada em ${formatDate(details?.subscriptionInfo?.currentPeriodEnd || user.subscription_current_period_end)}.`}
                  </p>
                ) : status === "trial_scheduled" ? (
                  <p className="text-sm text-muted-foreground max-w-xl">
                    Seu agendamento de faturamento futuro será cancelado. Você continuará com acesso gratuito do período de testes até o vencimento original e nenhuma cobrança será feita.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground max-w-xl">
                    Seu plano continuará ativo até o término do ciclo atual. Seus dados permanecerão armazenados de forma segura após o bloqueio.
                  </p>
                )}
              </div>
              
              {willCancelAtPeriodEnd ? (
                <Button
                  variant="default"
                  onClick={handleResumeSubscription}
                  disabled={loadingAction === "resume"}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground shrink-0 font-bold"
                >
                  {loadingAction === "resume" ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {status === "trial_canceled" ? "Reativar Agendamento" : "Reativar Assinatura"}
                </Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={loadingAction === "cancel"} className="shrink-0 font-bold">
                      {loadingAction === "cancel" ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                      {status === "trial_scheduled" ? "Cancelar Agendamento" : "Cancelar Assinatura"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border border-border/80 shadow-2xl backdrop-blur-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {status === "trial_scheduled" ? "Tem certeza que deseja cancelar o agendamento?" : "Tem certeza que deseja cancelar a assinatura?"}
                      </AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          {status === "trial_scheduled" ? (
                            <>
                              <p>
                                Seu agendamento será cancelado, porém <strong>seu período de testes continuará ativo</strong> até o final do período gratuito.
                              </p>
                              <ul className="list-disc pl-5 space-y-1 mt-2 text-foreground/80">
                                <li>Nenhuma cobrança será realizada no cartão cadastrado.</li>
                                <li>Você poderá re-agendar a assinatura a qualquer momento antes do término.</li>
                                <li>Após o fim do Trial, o acesso operacional (lançamento de pontos/resgates) será suspenso.</li>
                              </ul>
                            </>
                          ) : (
                            <>
                              <p>
                                Sua assinatura será programada para cancelamento, porém <strong>continuará ativa até o final do ciclo atual</strong>.
                              </p>
                              <ul className="list-disc pl-5 space-y-1 mt-2 text-foreground/80">
                                <li>Nenhuma nova cobrança será realizada.</li>
                                <li>Você poderá reativar a assinatura a qualquer momento antes da data de encerramento.</li>
                                <li>Seus dados, clientes e relatórios permanecerão armazenados com segurança.</li>
                                <li>Após o término do ciclo, o acesso operacional (lançamento de pontos/resgates) será bloqueado.</li>
                              </ul>
                            </>
                          )}
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Voltar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancelSubscription} className="bg-red-600 hover:bg-red-700 text-white">
                        Confirmar Cancelamento
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* FOOTER DIDÁTICO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 mt-12 border-t border-border/40">
        <div className="flex gap-3">
          <ShieldCheck className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">Pagamento Seguro</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Transações criptografadas ponta-a-ponta e processadas globalmente com padrão PCI Compliance via Stripe.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">Sem Fidelidade</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Cancele, mude de plano ou atrase seu ciclo com apenas um clique. Você está no controle da sua assinatura.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Sparkles className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">Evolução Contínua</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Novas funcionalidades lançadas serão habilitadas automaticamente no seu plano sem custos adicionais extras.
            </p>
          </div>
        </div>
      </div>

      <AlertDialog open={!!planChangeConfirm} onOpenChange={(open) => !open && setPlanChangeConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar Mudança para o Plano Pro ({planChangeConfirm?.planKey === "pro_anual" ? "Anual" : "Mensal"})
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground pt-1">
                {status === "trial_scheduled" ? (
                  <>
                    <p>
                      Você está alterando o agendamento da sua assinatura para o <strong>Plano Pro ({planChangeConfirm?.planKey === "pro_anual" ? "Anual" : "Mensal"})</strong>.
                    </p>
                    <div className="p-3 bg-muted/40 rounded-xl border space-y-1 text-xs text-foreground">
                      <p>• <strong>Novo valor previsto:</strong> R$ {planChangeConfirm?.planKey === "pro_anual" ? precoAnual : precoMensal}/{planChangeConfirm?.planKey === "pro_anual" ? "ano" : "mês"}</p>
                      <p>• <strong>Data da primeira cobrança:</strong> Ao término do seu período de testes em {formatDate(user.subscription_current_period_end)}.</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Caso tenha utilizado um cupom específico para o ciclo anterior, o desconto será desvinculado e a cobrança futura seguirá a tabela oficial do novo ciclo escolhido.
                    </p>
                  </>
                ) : (
                  <>
                    <p>Você está alterando o ciclo de faturamento da sua assinatura Pro para {planChangeConfirm?.planKey === "pro_anual" ? "Anual" : "Mensal"}.</p>
                    <div className="p-3 bg-muted/40 rounded-xl border space-y-1 text-xs text-foreground">
                      <p>• <strong>Novo valor:</strong> R$ {planChangeConfirm?.planKey === "pro_anual" ? precoAnual : precoMensal}/{planChangeConfirm?.planKey === "pro_anual" ? "ano" : "mês"}</p>
                      <p>• <strong>Efeito:</strong> A mudança é efetuada imediatamente com cálculo proporcional.</p>
                    </div>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAlterarPlano} className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold">
              {status === "trial_scheduled" ? "Confirmar Novo Agendamento" : "Confirmar Alteração Imediata"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CheckoutSuccessModal />
    </div>
  )
}
