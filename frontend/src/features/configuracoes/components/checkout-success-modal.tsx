"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth/auth-context"
import { api } from "@/lib/api/client"
import { syncBillingState } from "../utils/billing-sync"
import { useBillingState, BillingStatus } from "@/features/assinatura/hooks/use-billing-state"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, Check, ArrowRight } from "lucide-react"
import confetti from "canvas-confetti"

export function CheckoutSuccessModal() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<"processing" | "success_active" | "success_scheduled" | "timeout">("processing")
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollingCountRef = useRef(0)

  // 1. Detecta o status de checkout na URL
  const checkoutStatus = searchParams.get("checkout_status")
  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    if (checkoutStatus !== "success" || !sessionId) return

    // Chave dinâmica baseada no sessionId para evitar bloqueios de sessões passadas
    const storageKey = `checkout_success_shown_${sessionId}`
    const hasBeenShown = sessionStorage.getItem(storageKey)
    if (hasBeenShown === "true") {
      limparUrl()
      return
    }

    setIsOpen(true)
    setStatus("processing")
    pollingCountRef.current = 0

    // Limpa a query string da URL imediatamente para evitar F5 re-trigger
    limparUrl()

    // Inicia o polling de validação
    iniciarPolling(sessionId)

    // Grava no sessionStorage que esta sessão de checkout específica já está sendo processada
    sessionStorage.setItem(storageKey, "true")

    return () => {
      pararPolling()
    }
  }, [checkoutStatus, sessionId])

  const limparUrl = () => {
    const params = new URLSearchParams(window.location.search)
    params.delete("checkout_status")
    params.delete("session_id")
    const newQuery = params.toString()
    const cleanUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ""}`
    router.replace(cleanUrl, { scroll: false })
  }

  const iniciarPolling = (sessId: string | null) => {
    pararPolling()

    // Primeira checagem imediata
    verificarAssinatura(sessId)

    pollingIntervalRef.current = setInterval(() => {
      pollingCountRef.current += 1

      if (pollingCountRef.current >= 4) {
        // Atingiu 3 tentativas adicionais (totalizando ~4.5 segundos) sem detectar atualização
        pararPolling()
        setStatus("timeout")
        return
      }

      verificarAssinatura(sessId)
    }, 1500)
  }

  const pararPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }

  const verificarAssinatura = async (sessId: string | null) => {
    try {
      if (sessId) {
        // Sincroniza síncronamente via API do backend
        await api.post("/billing/sync-checkout", { sessionId: sessId })
      }

      // Invalida e força o recarregamento unificado do estado de billing no React Query
      await syncBillingState(queryClient)
      const updatedUser = queryClient.getQueryData<any>(["auth-profile"])

      if (updatedUser) {
        // Use the hook logic directly or replicate since we can't easily call hook conditionally
        const { subscription_status, subscription_price_id } = updatedUser
        const storageKey = sessId ? `checkout_success_shown_${sessId}` : "checkout_success_shown"
        
        if (subscription_status === "active") {
          pararPolling()
          setStatus("success_active")
          sessionStorage.setItem(storageKey, "true")
          dispararConfetes()
        } else if (subscription_status === "trialing" && subscription_price_id) {
          pararPolling()
          setStatus("success_scheduled")
          sessionStorage.setItem(storageKey, "true")
          dispararConfetes()
        }
      }
    } catch (err) {
      console.error("[Checkout Success Modal] Erro ao verificar assinatura:", err)
    }
  }

  const dispararConfetes = () => {
    const duration = 2.5 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })
    }, 250)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  const renderContent = () => {
    if (status === "processing") {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
          <div className="relative flex items-center justify-center">
            <div className="h-16 w-16 rounded-full border-4 border-primary/20 animate-pulse" />
            <Loader2 className="absolute h-8 w-8 text-primary animate-spin" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold">Validando seu pagamento</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Estamos confirmando a ativação do seu plano com a Stripe. Isso leva apenas alguns instantes...
            </p>
          </div>
        </div>
      )
    }

    if (status === "timeout") {
      return (
        <div className="flex flex-col items-center text-center space-y-5 py-4">
          <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Tudo quase pronto!</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Seu pagamento foi confirmado, mas a ativação está levando um pouco mais de tempo para sincronizar.
              Não se preocupe, seus recursos serão liberados em instantes!
            </p>
          </div>
          <Button onClick={handleClose} className="w-full">
            Entendido
          </Button>
        </div>
      )
    }

    if (status === "success_scheduled") {
      return (
        <div className="flex flex-col items-center text-center space-y-6 py-2">
          {/* Ícone Animado de Sucesso */}
          <div className="relative flex items-center justify-center">
            <div className="absolute h-20 w-20 rounded-full bg-blue-500/15 animate-ping duration-1000" />
            <div className="h-16 w-16 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 relative z-10">
              <CheckCircle2 className="h-10 w-10 animate-bounce" />
            </div>
          </div>

          {/* Informações do Plano */}
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
              Assinatura Agendada
            </span>
            <h3 className="text-2xl font-bold tracking-tight">
              Tudo Certo! Cartão Cadastrado 💳
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Sua assinatura foi agendada com sucesso. Você não será cobrado agora e seu Trial continuará ativo com todos os benefícios.
            </p>
          </div>

          {/* Botão de Fechamento */}
          <Button onClick={handleClose} className="w-full group">
            Voltar ao Sistema
            <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center text-center space-y-6 py-2">
        {/* Ícone Animado de Sucesso */}
        <div className="relative flex items-center justify-center">
          <div className="absolute h-20 w-20 rounded-full bg-green-500/15 animate-ping duration-1000" />
          <div className="h-16 w-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-600 dark:text-green-400 relative z-10">
            <CheckCircle2 className="h-10 w-10 animate-bounce" />
          </div>
        </div>

        {/* Informações do Plano */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
            Assinatura Ativa
          </span>
          <h3 className="text-2xl font-bold tracking-tight">
            Parabéns! Você agora é Pro 🌟
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Sua conta foi atualizada com sucesso! Todos os benefícios da sua nova assinatura já estão liberados.
          </p>
        </div>

        {/* Recursos Liberados */}
        <div className="w-full bg-muted/40 border border-border/50 rounded-2xl p-4 text-left space-y-3">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
            O que foi liberado:
          </span>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>Clientes e cadastros <strong className="font-semibold">ilimitados</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>Até <strong className="font-semibold">10 funcionários</strong> ativos na equipe.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>Personalização completa do <strong className="font-semibold">Regulamento</strong> e termos de fidelidade.</span>
            </li>
          </ul>
        </div>

        {/* Botão de Fechamento */}
        <Button onClick={handleClose} className="w-full group">
          Acessar Recursos
          <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-[400px] rounded-3xl p-6 border border-border/80 shadow-2xl backdrop-blur-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Confirmação de Assinatura</DialogTitle>
          <DialogDescription>Validando o pagamento da sua assinatura pós checkout.</DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  )
}
