"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Users, TrendingUp, TrendingDown, Clock, Activity, Gift, Plus } from "lucide-react"

import { api } from "@/lib/api/client"
import { DashboardStats } from "@/lib/api/types"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { DashboardStatsCards } from "@/components/dashboard/dashboard-stats"
import { DashboardCharts } from "@/components/dashboard/dashboard-charts"
import { SmartInsights } from "@/components/dashboard/smart-insights"
import { TopCustomers } from "@/components/dashboard/top-customers"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { SkeletonDashboard } from "@/components/dashboard/skeleton-dashboard"

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<string>("30")

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      try {
        const response = await api.get<{ success: boolean, data: DashboardStats }>(`/dashboard/stats?period=${period}`)
        if (response && response.data) {
          setStats(response.data)
        } else {
          setStats(response as unknown as DashboardStats) 
        }
      } catch (err: any) {
        console.error("Erro ao carregar estatísticas:", err)
        toast.error("Erro ao carregar estatísticas do painel.")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [period])

  const isEmpty = stats && stats.clientes.total === 0 && stats.pontos.emitidos === 0;

  return (
    <AuthGuard allowedRoles={["admin", "operador"]}>
      <PageContainer
        title="Dashboard"
        description="Resumo executivo do seu programa de fidelidade."
        actions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            <Select value={period} onValueChange={setPeriod} disabled={loading}>
              <SelectTrigger className="w-full sm:w-[140px] h-9">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild className="w-full sm:w-auto h-9 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 hover:scale-105 cursor-pointer">
              <Link href="/admin/fidelidade">Lançar Pontos</Link>
            </Button>
          </div>
        }
      >

      {loading ? (
        <SkeletonDashboard />
      ) : isEmpty ? (
        <div className="mt-8 flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed bg-muted/30">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Gift className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold tracking-tight mb-2">Bem-vindo ao seu Programa de Fidelidade!</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Parece que você ainda não registrou nenhuma movimentação. Comece lançando pontos para o seu primeiro cliente e acompanhe o crescimento aqui no Dashboard.
          </p>
          <Button asChild className="gap-2">
            <Link href="/admin/fidelidade">
              <Plus className="w-4 h-4" />
              Realizar Primeiro Lançamento
            </Link>
          </Button>
        </div>
      ) : stats ? (
        <div className="mt-4 md:mt-5 space-y-4 md:space-y-6 pb-10">
          <DashboardStatsCards stats={stats} />
          <SmartInsights stats={stats} />
          <DashboardCharts data={stats.chartData} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopCustomers customers={stats.topClientes} />
            <RecentActivity activities={stats.atividades} />
          </div>
        </div>
      ) : null}
      </PageContainer>
    </AuthGuard>
  )
}
