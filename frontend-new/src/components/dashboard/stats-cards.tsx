"use client"

import { ArrowUpRight, Users, Clock, CheckCircle2, Gift } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useState } from "react"
import { DashboardStats } from "@/lib/api/types"
import { Skeleton } from "@/components/ui/skeleton"

interface StatsCardsProps {
  stats: DashboardStats | null
  loading: boolean
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 bg-card border border-border/60 shadow-md h-[115px] flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-24 bg-muted-foreground/10" />
              <Skeleton className="h-6 w-6 rounded-full bg-muted-foreground/10" />
            </div>
            <Skeleton className="h-8 w-16 bg-muted-foreground/10" />
            <Skeleton className="h-3 w-32 bg-muted-foreground/10" />
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: "Clientes Cadastrados",
      value: stats.totalClientes.toLocaleString("pt-BR"),
      increase: "Base ativa de clientes",
      bgColor: "bg-primary",
      textColor: "text-primary-foreground",
      icon: Users,
      delay: "0ms",
    },
    {
      title: "Pontos Pendentes",
      value: stats.pontosPendentes.toLocaleString("pt-BR"),
      increase: "Em período de carência",
      bgColor: "bg-card",
      textColor: "text-foreground",
      icon: Clock,
      delay: "100ms",
    },
    {
      title: "Pontos Disponíveis",
      value: stats.pontosDisponiveis.toLocaleString("pt-BR"),
      increase: "Prontos para resgate",
      bgColor: "bg-card",
      textColor: "text-foreground",
      icon: CheckCircle2,
      delay: "200ms",
    },
    {
      title: "Pontos Resgatados",
      value: stats.pontosResgatados.toLocaleString("pt-BR"),
      increase: "Utilizados em prêmios",
      bgColor: "bg-card",
      textColor: "text-foreground",
      icon: Gift,
      delay: "300ms",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card
            key={card.title}
            onMouseEnter={() => setHoveredCard(index)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{ animationDelay: card.delay }}
            className={`${card.bgColor} ${card.textColor} p-4 border border-border/50 transition-all duration-500 ease-out animate-slide-in-up cursor-pointer relative overflow-hidden ${
              hoveredCard === index ? "scale-[1.03] shadow-xl" : "shadow-md"
            }`}
          >
            <div className="flex items-start justify-between mb-3 relative z-10">
              <h3 className="text-xs font-semibold opacity-90 tracking-wide uppercase">{card.title}</h3>
              <div
                className={`w-7 h-7 rounded-lg ${
                  card.bgColor === "bg-primary" ? "bg-primary-foreground/15" : "bg-primary/10"
                } flex items-center justify-center transition-transform duration-300 ${
                  hoveredCard === index ? "rotate-12 scale-110" : ""
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${card.bgColor === "bg-primary" ? "text-primary-foreground" : "text-primary"}`}
                />
              </div>
            </div>
            <p className="text-3xl font-bold mb-1.5 relative z-10">{card.value}</p>
            <div className="flex items-center gap-1 text-[11px] opacity-75 relative z-10">
              <span>{card.increase}</span>
            </div>

            {/* Decorative background pulse glow on hover */}
            {hoveredCard === index && (
              <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-primary/5 blur-xl pointer-events-none" />
            )}
          </Card>
        )
      })}
    </div>
  )
}
