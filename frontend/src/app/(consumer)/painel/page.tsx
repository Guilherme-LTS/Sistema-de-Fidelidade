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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map((membership) => (
            <Link 
              key={membership.tenant_id} 
              href={`/painel/${membership.tenant_slug}`}
              className="block group"
            >
              <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 border-border/50 hover:border-primary/30 bg-gradient-to-br from-background to-muted/30 relative">
                {/* Decorative glow */}
                <div className="absolute -right-12 -top-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-500" />
                <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-accent/10 rounded-full blur-2xl group-hover:bg-accent/20 transition-all duration-500" />
                
                <CardContent className="p-6 relative z-10 space-y-6">
                  {/* Header / Logo */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {membership.tenant_logo ? (
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-background shadow-sm">
                          <img src={membership.tenant_logo} alt={membership.tenant_name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-background shadow-sm flex items-center justify-center text-primary font-bold text-lg">
                          {membership.tenant_name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-lg leading-none tracking-tight group-hover:text-primary transition-colors">{membership.tenant_name}</h3>
                        <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wider">Cartão Fidelidade</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <ArrowRight className="w-4 h-4 text-primary group-hover:text-current" />
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Saldo Disponível</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-black tracking-tighter text-foreground">{membership.pontos_disponiveis}</span>
                      <span className="text-sm font-semibold text-primary flex items-center gap-1">
                        pts <Star className="w-4 h-4 fill-primary text-primary" />
                      </span>
                    </div>
                  </div>

                  {/* Footer Stats */}
                  <div className="flex items-center gap-4 pt-4 border-t border-border/50">
                    <div className="flex-1">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Pendentes</p>
                      <p className="font-semibold text-sm">{membership.pontos_pendentes}</p>
                    </div>
                    <div className="w-px h-8 bg-border/50" />
                    <div className="flex-1">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">A Expirar</p>
                      <p className="font-semibold text-sm text-amber-500">{membership.pontos_expirando}</p>
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
