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
        <Card className="border-dashed bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
            <Store className="h-12 w-12 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">Nenhuma pontuação encontrada</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Parece que você ainda não tem pontos acumulados ou o CPF informado não está vinculado a nenhuma loja.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {memberships.map((membership) => (
            <Card key={membership.tenant_id} className="overflow-hidden hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center gap-4 pb-4">
                {membership.tenant_logo ? (
                  <img src={membership.tenant_logo} alt={membership.tenant_name} className="w-12 h-12 rounded-full object-cover border" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {membership.tenant_name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{membership.tenant_name}</CardTitle>
                  <CardDescription className="text-xs">Cliente Fidelidade</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end justify-between bg-muted/30 p-4 rounded-xl border border-border/50">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saldo Atual</p>
                    <p className="text-3xl font-bold text-primary flex items-center gap-2">
                      {membership.pontos_disponiveis} <Star className="h-5 w-5 fill-primary text-primary" />
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-card border p-2 rounded-lg text-center space-y-0.5">
                    <p className="text-muted-foreground">Pendentes</p>
                    <p className="font-semibold">{membership.pontos_pendentes}</p>
                  </div>
                  <div className="bg-card border p-2 rounded-lg text-center space-y-0.5">
                    <p className="text-muted-foreground">A Expirar</p>
                    <p className="font-semibold text-amber-500">{membership.pontos_expirando}</p>
                  </div>
                </div>

                {/* Exemplo de Link para o extrato detalhado de uma loja específica */}
                <Button variant="outline" className="w-full text-xs h-9" asChild>
                  <Link href={`/fidelidade/${membership.tenant_slug}`}>
                    Ver Prêmios <ArrowRight className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
