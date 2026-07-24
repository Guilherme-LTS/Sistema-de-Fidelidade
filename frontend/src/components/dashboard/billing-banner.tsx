"use client"

import { useAuth } from "@/lib/auth/auth-context"
import Link from "next/link"
import { AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react"

export function BillingBanner() {
  const { user } = useAuth()

  if (!user || user.role === "novato") return null

  const status = user.subscription_status
  const periodEnd = user.subscription_current_period_end

  const isPastDue = status === "past_due"
  const isCanceled = status === "canceled" || !status

  // Calcular dias de trial restantes
  const getTrialDaysRemaining = () => {
    if (!periodEnd) return 0
    const diff = new Date(periodEnd).getTime() - Date.now()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days > 0 ? days : 0
  }

  const isTrial = status === "trialing"
  const trialDays = getTrialDaysRemaining()
  const trialEndingSoon = isTrial && trialDays > 0 && trialDays <= 3
  const trialExpired = isTrial && trialDays <= 0

  const isBlocked = status === "canceled" || !status || trialExpired

  // Se a assinatura está ativa, ou o trial está ativo e saudável, não mostra banner
  if (status === "active" || (isTrial && !trialEndingSoon && !trialExpired)) {
    return null
  }

  const isAdmin = user.role === "admin"

  return (
    <div className="mb-4 animate-in slide-in-from-top duration-300">
      {isPastDue && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-amber-500 text-amber-950 rounded-xl shadow-md border border-amber-400">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold">
              {isAdmin 
                ? "Pagamento em atraso. Regularize sua assinatura para reativar as funções operacionais do seu estabelecimento."
                : "Pagamento em atraso. As funções operacionais do seu estabelecimento foram suspensas temporariamente. Por favor, avise o administrador da conta."}
            </span>
          </div>
          {isAdmin && (
            <Link
              href="/admin/assinatura"
              className="flex items-center gap-1 text-xs font-bold underline hover:no-underline shrink-0"
            >
              Regularizar Assinatura <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}

      {isBlocked && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-red-500 text-white rounded-xl shadow-md border border-red-400">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold">
              {isAdmin
                ? (trialExpired 
                    ? "Seu período de teste grátis terminou. Funções operacionais (lançamento de pontos e resgates) estão suspensas."
                    : "Assinatura expirada ou inativa. As funções de lançamento de pontos e resgates estão bloqueadas.")
                : "Acesso Operacional Suspenso por pendência financeira. As funções de lançamento de pontos e resgates estão bloqueadas. Avise o administrador."
              }
            </span>
          </div>
          {isAdmin && (
            <Link
              href="/admin/assinatura"
              className="flex items-center gap-1 text-xs font-bold bg-white text-red-600 px-3 py-1.5 rounded-lg hover:bg-white/90 shadow-sm shrink-0"
            >
              Ativar Plano <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}

      {trialEndingSoon && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-blue-600 text-white rounded-xl shadow-md border border-blue-500">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold">
              {isAdmin 
                ? <>Seu período de testes grátis (trial) termina em <strong>{trialDays === 0 ? "menos de 24 horas" : `${trialDays} ${trialDays === 1 ? "dia" : "dias"}`}</strong>. Adicione um cartão para evitar bloqueios.</>
                : <>Seu período de testes grátis (trial) termina em <strong>{trialDays === 0 ? "menos de 24 horas" : `${trialDays} ${trialDays === 1 ? "dia" : "dias"}`}</strong>.</>
              }
            </span>
          </div>
          {isAdmin && (
            <Link
              href="/admin/assinatura"
              className="flex items-center gap-1 text-xs font-bold bg-white text-blue-600 px-3 py-1.5 rounded-lg hover:bg-white/90 shadow-sm shrink-0"
            >
              Assinar Plano <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
