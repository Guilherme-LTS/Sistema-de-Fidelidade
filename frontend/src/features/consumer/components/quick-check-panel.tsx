"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Search, Store, Star, Gift, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Card, CardContent } from "@/components/ui/card"
import { formatCPF } from "@/lib/masks"
import { checkPointsGlobally, checkPointsForTenant, QuickCheckGlobalResult, QuickCheckTenantResult } from "../consumer.api"
import Link from "next/link"

const searchSchema = z.object({
  cpf: z.string().min(14, "CPF incompleto."),
})

type SearchFormValues = z.infer<typeof searchSchema>

interface QuickCheckPanelProps {
  tenantSlug?: string
  onSwitchToLogin?: () => void
}

export function QuickCheckPanel({ tenantSlug, onSwitchToLogin }: QuickCheckPanelProps) {
  const [loading, setLoading] = useState(false)
  const [globalResult, setGlobalResult] = useState<QuickCheckGlobalResult | null>(null)
  const [tenantResult, setTenantResult] = useState<QuickCheckTenantResult | null>(null)

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: { cpf: "" },
  })

  const onSubmit = async (values: SearchFormValues) => {
    setLoading(true)
    setGlobalResult(null)
    setTenantResult(null)
    
    try {
      const cleanCpf = values.cpf.replace(/\D/g, '')
      
      if (tenantSlug && tenantSlug !== 'Geral') {
        const result = await checkPointsForTenant(tenantSlug, cleanCpf)
        setTenantResult(result)
      } else {
        const result = await checkPointsGlobally(cleanCpf)
        setGlobalResult(result)
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || "Erro ao consultar CPF."
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // Se já buscou num contexto de restaurante (Tenant específico)
  if (tenantResult) {
    const unachievableRewards = tenantResult.rewards
      .filter(r => r.pointsCost > tenantResult.points)
      .sort((a, b) => a.pointsCost - b.pointsCost)
    
    const nextReward = unachievableRewards[0] || null

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold">Olá, {tenantResult.firstName}!</h2>
          <p className="text-muted-foreground text-sm">Aqui está o seu resumo atual.</p>
        </div>

        <Card className="bg-primary/5 border-primary/20 shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saldo Atual</p>
              <p className="text-3xl font-bold text-primary flex items-center gap-2">
                {tenantResult.points} <Star className="h-5 w-5 fill-primary text-primary" />
              </p>
            </div>
            {nextReward && (
              <div className="text-right max-w-[120px]">
                <p className="text-xs text-muted-foreground">Faltam <strong className="text-foreground">{nextReward.pointsCost - tenantResult.points} pts</strong> para:</p>
                <p className="text-xs font-semibold truncate" title={nextReward.name}>{nextReward.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {tenantResult.rewards.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Gift className="h-4 w-4" /> Recompensas Disponíveis
            </h3>
            <div className="grid gap-2">
              {tenantResult.rewards.map(reward => {
                const isRedeemable = tenantResult.points >= reward.pointsCost;
                return (
                  <div key={reward.id} className={`p-3 rounded-xl border flex justify-between items-center ${isRedeemable ? 'bg-card border-primary/20' : 'bg-muted/30 border-border opacity-70'}`}>
                    <div>
                      <p className="font-medium text-sm">{reward.name}</p>
                      {!isRedeemable && (
                        <p className="text-xs text-muted-foreground">Faltam {reward.pointsCost - tenantResult.points} pts</p>
                      )}
                    </div>
                    <Badge variant={isRedeemable ? "default" : "secondary"} className="whitespace-nowrap ml-2">
                      {reward.pointsCost} pts
                    </Badge>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-border flex flex-col gap-2">
          {onSwitchToLogin && (
            <Button onClick={onSwitchToLogin} className="w-full">
              Entrar na minha conta
            </Button>
          )}
          <Button variant="ghost" onClick={() => setTenantResult(null)} className="w-full text-xs">
            Fazer nova consulta
          </Button>
        </div>
      </div>
    )
  }

  // Se já buscou no contexto global (Página inicial)
  if (globalResult) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold">Olá, {globalResult.firstName}!</h2>
          <p className="text-muted-foreground text-sm">Você possui saldo nos seguintes locais:</p>
        </div>

        {globalResult.memberships.length === 0 ? (
          <div className="text-center py-6 bg-muted/30 rounded-xl border border-dashed">
            <Store className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Você ainda não tem pontos acumulados em nenhum parceiro.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {globalResult.memberships.map((membership) => (
              <div key={membership.tenant_id} className="p-4 bg-card border rounded-xl flex flex-col gap-3 relative group hover:border-primary/30 transition-colors shadow-sm">
                
                {/* Header (Logo + Nome + Botão) */}
                <div className="flex items-center gap-3">
                  {membership.tenant_logo ? (
                    <img src={membership.tenant_logo} alt={membership.tenant_name} className="w-10 h-10 rounded-full object-cover border" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                      {membership.tenant_name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate text-foreground">{membership.tenant_name}</p>
                  </div>
                </div>

                {/* Saldo Principal */}
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-3xl font-black tracking-tighter text-foreground">{membership.pontos_disponiveis}</span>
                  <span className="text-sm font-bold text-primary flex items-center gap-1">pts <Star className="h-3.5 w-3.5 fill-primary" /></span>
                </div>

                {/* Recompensa Disponível Highlight */}
                {membership.has_redeemable_reward && (
                  <div className="mt-1 flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium px-2.5 py-1 rounded-md border border-emerald-500/20 w-fit">
                    <Gift className="w-3.5 h-3.5" />
                    Você já pode resgatar prêmios!
                  </div>
                )}

                {/* Metadados: Pendentes / A Expirar */}
                {(membership.pontos_pendentes > 0 || membership.pontos_expirando > 0) && (
                  <div className="flex items-center gap-4 pt-3 border-t border-border/40 mt-1">
                    {membership.pontos_pendentes > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        <span className="text-[11px] font-medium text-muted-foreground">
                          <strong className="text-foreground">{membership.pontos_pendentes}</strong> pendentes
                        </span>
                      </div>
                    )}
                    {membership.pontos_expirando > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse`} />
                        <span className="text-[11px] font-medium text-muted-foreground">
                          <strong className="text-amber-600 dark:text-amber-500">{membership.pontos_expirando}</strong> expirando
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-border flex flex-col gap-2">
          {onSwitchToLogin && (
            <Button onClick={onSwitchToLogin} className="w-full">
              Entrar na minha conta
            </Button>
          )}
          <Button variant="ghost" onClick={() => setGlobalResult(null)} className="w-full text-xs">
            Fazer nova consulta
          </Button>
        </div>
      </div>
    )
  }

  // Estado Inicial: Formulário de Busca
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="font-semibold text-lg">Consulta Rápida</h3>
        <p className="text-sm text-muted-foreground">Veja seus pontos usando apenas o seu CPF.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="search-cpf">Seu CPF</Label>
        <Input
          id="search-cpf"
          placeholder="000.000.000-00"
          type="tel"
          className="h-12 text-center text-lg tracking-wider"
          {...form.register("cpf", {
            onChange: (e) => {
              e.target.value = formatCPF(e.target.value)
            }
          })}
        />
        {form.formState.errors.cpf && (
          <p className="text-xs text-destructive text-center mt-1">{form.formState.errors.cpf.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full h-12 text-md mt-2" disabled={loading}>
        {loading ? <Spinner className="mr-2" /> : (
          <><Search className="mr-2 h-4 w-4" /> Consultar Pontos</>
        )}
      </Button>
    </form>
  )
}

function Badge({ children, variant, className }: { children: React.ReactNode, variant: "default" | "secondary", className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
      variant === "default" ? "bg-primary text-primary-foreground hover:bg-primary/80" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
    } ${className || ""}`}>
      {children}
    </span>
  )
}
