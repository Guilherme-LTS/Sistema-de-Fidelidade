"use client"

import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth/auth-context"
import { api } from "@/lib/api/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Sparkles, Calendar, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import confetti from "canvas-confetti"

export function TrialOnboardingModal() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [isOpen, setIsOpen] = useState(false)
  const [carregando, setCarregando] = useState(false)

  // O modal deve abrir se o usuário for um administrador, o status da assinatura for trialing
  // e o onboarding do trial ainda não tiver sido exibido (trial_onboarding_shown === false)
  const isTrial = user?.subscription_status === "trialing"
  const isOwner = user?.role === "admin"
  const showOnboarding = user?.trial_onboarding_shown === false

  useEffect(() => {
    if (isTrial && isOwner && showOnboarding) {
      setIsOpen(true)
      dispararConfetes()
    }
  }, [isTrial, isOwner, showOnboarding])

  const dispararConfetes = () => {
    // Dispara uma explosão festiva rápida
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    })
  }

  const handleConfirmar = async () => {
    setCarregando(true)
    try {
      await api.post("/billing/onboarding-complete")
      // Invalida o cache do perfil do usuário para atualizar a flag trial_onboarding_shown no context
      await queryClient.invalidateQueries({ queryKey: ["auth-profile"] })
      setIsOpen(false)
    } catch (error) {
      console.error("[Onboarding] Erro ao concluir onboarding:", error)
      toast.error("Ocorreu um erro ao iniciar sua experiência. Tente novamente.")
    } finally {
      setCarregando(false)
    }
  }

  if (!user || !user.subscription_current_period_end) return null

  // Calcular dias restantes
  const dataFim = new Date(user.subscription_current_period_end)
  const hoje = new Date()
  const diffTime = dataFim.getTime() - hoje.getTime()
  const diasRestantes = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  const dataFormatada = dataFim.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-[440px] rounded-3xl p-6 border border-border/80 shadow-2xl backdrop-blur-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Bem-vindo ao Período de Testes</DialogTitle>
          <DialogDescription>
            Onboarding do período de testes gratuito do Pontus.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center text-center space-y-6 py-2">
          {/* Badge Decorado */}
          <div className="relative flex items-center justify-center">
            <div className="absolute h-16 w-16 rounded-2xl bg-primary/10 rotate-12" />
            <div className="h-16 w-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary relative z-10">
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            </div>
          </div>

          {/* Cabeçalho */}
          <div className="space-y-1.5">
            <h3 className="text-2xl font-bold tracking-tight text-foreground">
              Seja bem-vindo ao Pontus! 🚀
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Seu período de teste gratuito do <strong className="font-semibold">Plano Pontus Pro</strong> foi ativado com sucesso.
            </p>
          </div>

          {/* Banner de Prazos */}
          <div className="w-full bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3 text-left">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs text-primary font-bold uppercase tracking-wider block">
                Período de Testes ({diasRestantes} dias restantes)
              </span>
              <span className="text-sm font-medium text-foreground">
                Válido até {dataFormatada}
              </span>
            </div>
          </div>

          {/* O que ele pode testar */}
          <div className="w-full text-left space-y-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              O que você pode fazer no teste:
            </span>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2.5">
                <div className="h-5 w-5 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-muted-foreground">
                  Cadastrar <strong className="text-foreground">clientes ilimitados</strong> e fidelizá-los.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="h-5 w-5 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-muted-foreground">
                  Adicionar até <strong className="text-foreground">10 operadores</strong> na sua equipe.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="h-5 w-5 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-muted-foreground">
                  Criar campanhas de pontuação e catálogos de prêmios.
                </span>
              </li>
            </ul>
          </div>

          {/* Botão de Confirmação */}
          <Button onClick={handleConfirmar} disabled={carregando} className="w-full" size="lg">
            {carregando ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Configurando...
              </>
            ) : (
              "Começar a Usar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
