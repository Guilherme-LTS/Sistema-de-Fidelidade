"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { api } from "@/lib/api/client"
import { DashboardStats } from "@/lib/api/types"
import { Header } from "@/components/dashboard/header"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { ProjectAnalytics } from "@/components/dashboard/project-analytics"
import { Reminders } from "@/components/dashboard/reminders"
import { ProjectList } from "@/components/dashboard/project-list"
import { TeamCollaboration } from "@/components/dashboard/team-collaboration"
import { ProjectProgress } from "@/components/dashboard/project-progress"
import { MobileAppCard } from "@/components/dashboard/mobile-app-card"
import { TimeTracker } from "@/components/dashboard/time-tracker"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await api.get<DashboardStats>("/dashboard/stats")
        setStats(data)
      } catch (err: any) {
        console.error("Erro ao carregar estatísticas:", err)
        toast.error("Erro ao carregar estatísticas do painel. Verifique a conexão com o backend.")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <>
      <Header
        title="Dashboard"
        description="Acompanhe os indicadores principais do programa de fidelidade."
        actions={
          <>
            <Button className="w-full sm:w-auto h-9 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 hover:scale-105 cursor-pointer">
              Nova operacao
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto h-9 text-sm transition-all duration-300 hover:shadow-md hover:scale-105 bg-transparent cursor-pointer"
            >
              Exportar dados
            </Button>
          </>
        }
      />

      <div className="mt-4 md:mt-5 space-y-3 md:space-y-4">
        <StatsCards stats={stats} loading={loading} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
          <div className="lg:col-span-2 space-y-3 md:space-y-4">
            <ProjectAnalytics chartData={stats?.chartData || []} loading={loading} />
            <TeamCollaboration clients={stats?.recentes || []} loading={loading} />
          </div>

          <div className="space-y-3 md:space-y-4">
            <Reminders />
            <ProjectProgress />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <ProjectList />
          <MobileAppCard />
          <TimeTracker />
        </div>
      </div>
    </>
  )
}
