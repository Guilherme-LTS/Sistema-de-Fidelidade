"use client"

import { Card } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { ChartDataItem } from "@/lib/api/types"
import { Skeleton } from "@/components/ui/skeleton"

interface ProjectAnalyticsProps {
  chartData: ChartDataItem[]
  loading: boolean
}

export function ProjectAnalytics({ chartData, loading }: ProjectAnalyticsProps) {
  if (loading) {
    return (
      <Card className="p-6 h-[380px] flex flex-col justify-between border border-border/60 shadow-md">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-6 w-48 bg-muted-foreground/10" />
          <Skeleton className="h-4 w-28 bg-muted-foreground/10" />
        </div>
        <div className="flex-1 flex items-end gap-3 px-4 pb-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex-1 flex flex-col gap-2 items-center">
              <Skeleton className="w-full h-32 bg-muted-foreground/5" />
              <Skeleton className="h-3 w-6 bg-muted-foreground/10" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  // Calcula valores de pico e média gerais para fins informativos
  const totalPoints = chartData.reduce(
    (acc, cur) => acc + cur.pendentes + cur.lancados + cur.resgates,
    0
  )
  const averagePoints = chartData.length > 0 ? Math.round(totalPoints / chartData.length) : 0
  const peakPoints = chartData.reduce(
    (max, cur) => Math.max(max, cur.pendentes, cur.lancados, cur.resgates),
    0
  )

  return (
    <Card
      className="p-6 transition-all duration-500 hover:shadow-xl animate-slide-in-up bg-gradient-to-br from-background to-muted/20 border border-border/50"
      style={{ animationDelay: "400ms" }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-foreground">Movimentação de Pontos</h2>
          <p className="text-xs text-muted-foreground">Histórico dos últimos 7 dias</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          <span>Atualização em tempo real</span>
        </div>
      </div>

      <div className="h-64 mb-4 relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted/10" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "currentColor", fontSize: 11 }}
              className="text-muted-foreground"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "currentColor", fontSize: 11 }}
              className="text-muted-foreground"
              tickFormatter={(value) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "10px",
                color: "hsl(var(--foreground))",
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "12px", paddingBottom: "10px" }}
            />
            <Bar dataKey="pendentes" name="Pendentes" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30} />
            <Bar dataKey="lancados" name="Lançados" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
            <Bar dataKey="resgates" name="Resgates" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="pt-4 border-t border-border/50 flex items-center justify-between">
        <div className="text-xs">
          <span className="text-muted-foreground">Média Diária: </span>
          <span className="font-semibold text-foreground">{averagePoints.toLocaleString("pt-BR")} pts</span>
        </div>
        <div className="text-xs">
          <span className="text-muted-foreground">Pico de Atividade: </span>
          <span className="font-semibold text-emerald-600">{peakPoints.toLocaleString("pt-BR")} pts</span>
        </div>
      </div>
    </Card>
  )
}
