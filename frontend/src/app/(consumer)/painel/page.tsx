"use client"

import { useQuery } from "@tanstack/react-query"
import { useConsumerAuth } from "@/features/consumer/contexts/consumer-auth-context"
import { api } from "@/lib/api/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Store, Star, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ConsumerDashboardResponse {
  profile: {
    name: string
    document: string
  }
  memberships: {
    tenant_id: string
    tenant_name: string
    tenant_slug: string
    tenant_logo: string | null
    customer_id: string
    pontos_disponiveis: number
    pontos_pendentes: number
    pontos_expirando: number
  }[]
}

export default function ConsumerPanel() {
  const { data: consumerData, loading } = useConsumerAuth()
  const user = consumerData?.profile

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  const profile = consumerData?.profile
  const memberships = consumerData?.memberships || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Olá, {profile?.name?.split(' ')[0] || 'Cliente'}</h1>
        <p className="text-muted-foreground text-sm">Acompanhe seus pontos e recompensas.</p>
      </div>

      {memberships.length === 0 ? (
        <Card className="border-dashed bg-muted/20 border-2">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
              <Store className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground text-lg">Nenhuma carteira encontrada</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Você ainda não pontuou em nenhuma loja parceira. Quando informar seu CPF em uma compra, seu cartão digital aparecerá aqui automaticamente.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:gap-6 lg:gap-8 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {memberships.map((membership) => (
            <Link 
              key={membership.tenant_id} 
              href={`/painel/${membership.tenant_slug}`}
              className="block group outline-none"
            >
              <Card className="overflow-hidden transition-all duration-400 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 border-border/60 bg-card flex flex-col rounded-[1.25rem] md:rounded-[1.5rem] relative h-full">
                {/* Cover Banner */}
                <div className="h-28 md:h-36 relative shrink-0 bg-muted overflow-hidden">
                  {membership.tenant_logo ? (
                    <>
                      <img 
                        src={membership.tenant_logo} 
                        className="absolute inset-0 w-full h-full object-cover object-center blur-[3px] opacity-75 transition-transform duration-700 group-hover:scale-105"
                        alt="" 
                      />
                      {/* Gradient overlays to ensure badge readability and a clean bottom edge */}
                      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />
                  )}
                  
                  {/* Badge */}
                  <div className="absolute top-4 right-4 md:top-5 md:right-5 bg-background/95 backdrop-blur-sm px-3 md:px-3.5 py-1 md:py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-border/50">
                    <Star className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary fill-primary" />
                    <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-foreground">Fidelidade</span>
                  </div>
                </div>

                <CardContent className="p-5 md:p-7 pt-0 relative flex-1 flex flex-col">
                  {/* Avatar & Action Button */}
                  <div className="flex justify-between items-end mb-4 md:mb-5">
                    {/* Overlapping Avatar */}
                    <div className="relative -mt-10 md:-mt-8 z-10 transition-transform duration-500 group-hover:-translate-y-1">
                      {membership.tenant_logo ? (
                        <div className="w-20 h-20 md:w-16 md:h-16 rounded-[1rem] md:rounded-xl border-[4px] md:border-[3px] border-card bg-white dark:bg-zinc-950 shadow-sm overflow-hidden p-1 md:p-0.5">
                          <img src={membership.tenant_logo} alt={membership.tenant_name} className="w-full h-full object-contain rounded-lg md:rounded-lg" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 md:w-16 md:h-16 rounded-[1rem] md:rounded-xl border-[4px] md:border-[3px] border-card bg-primary text-primary-foreground flex items-center justify-center text-3xl md:text-2xl font-bold shadow-sm">
                          {membership.tenant_name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Action Text */}
                    <div className="mb-2 md:mb-1 md:opacity-0 md:group-hover:opacity-100 md:-translate-x-2 md:group-hover:translate-x-0 transition-all duration-300">
                      <span className="inline-flex items-center gap-1.5 text-xs md:text-sm font-bold text-primary transition-all md:bg-transparent md:px-0 md:py-0 md:shadow-none">
                        Acessar Painel <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="mb-5 md:mb-4">
                    <h3 className="text-xl md:text-xl font-bold leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors pr-2">
                      {membership.tenant_name}
                    </h3>
                  </div>

                  {/* Primary Balance */}
                  <div className="flex flex-col gap-1 md:gap-0.5">
                    <p className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-widest">Saldo Disponível</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl md:text-4xl font-black tracking-tighter text-foreground">
                        {membership.pontos_disponiveis}
                      </span>
                      <span className="text-sm md:text-sm font-bold text-muted-foreground">
                        pts
                      </span>
                    </div>
                  </div>

                  {/* Spacer to push widgets to the bottom if the card grows */}
                  <div className="flex-1 min-h-[1.5rem] md:min-h-[1.5rem]" />

                  {/* Secondary Metrics Widgets */}
                  <div className="mt-6 md:mt-0 grid grid-cols-2 md:flex md:flex-row md:items-center md:gap-5 gap-3 md:pt-4 md:border-t md:border-border/30">
                    {/* Pendentes */}
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-1.5 bg-muted/30 md:bg-transparent rounded-xl md:rounded-none p-3 md:p-0 border border-border/40 md:border-none transition-colors hover:bg-muted/50 md:hover:bg-transparent">
                      <div className="flex items-center gap-1.5 mb-0.5 md:mb-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase md:capitalize md:tracking-normal tracking-wider">Pendentes:</span>
                      </div>
                      <div className="flex items-baseline gap-1 md:gap-1">
                        <span className="text-lg md:text-sm font-bold text-foreground leading-none">{membership.pontos_pendentes}</span>
                        <span className="text-[10px] font-medium text-muted-foreground hidden md:inline">pts</span>
                      </div>
                    </div>

                    {/* A Expirar */}
                    <div className={`flex flex-col gap-1 md:flex-row md:items-center md:gap-1.5 rounded-xl md:rounded-none p-3 md:p-0 border md:border-none transition-colors ${membership.pontos_expirando > 0 ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15 md:bg-transparent md:hover:bg-transparent' : 'bg-muted/30 border-border/40 hover:bg-muted/50 md:bg-transparent md:hover:bg-transparent'}`}>
                      <div className="flex items-center gap-1.5 mb-0.5 md:mb-0">
                        <div className={`w-1.5 h-1.5 rounded-full ${membership.pontos_expirando > 0 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse' : 'bg-muted-foreground/40'}`} />
                        <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase md:capitalize md:tracking-normal tracking-wider">A Expirar:</span>
                      </div>
                      <div className="flex items-baseline gap-1 md:gap-1">
                        <span className={`text-lg md:text-sm font-bold leading-none ${membership.pontos_expirando > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-foreground'}`}>
                          {membership.pontos_expirando}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground hidden md:inline">pts</span>
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
