"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { ChartDataItem } from "@/lib/api/types"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { Activity } from "lucide-react"

interface Props {
  data: ChartDataItem[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const date = new Date(label).toLocaleDateString("pt-BR", { 
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' 
    })
    
    const emitidos = payload.find((p: any) => p.dataKey === "emitidos")?.value || 0
    const resgatados = payload.find((p: any) => p.dataKey === "resgatados")?.value || 0
    const expirados = payload.find((p: any) => p.dataKey === "expirados")?.value || 0
    const saldoLiquido = emitidos - resgatados - expirados

    return (
      <div className="bg-background/95 backdrop-blur-md border border-border/50 p-4 rounded-xl shadow-xl w-64 ring-1 ring-black/5">
        <p className="text-sm font-medium text-foreground mb-3 pb-2 border-b border-border/50 capitalize">{date}</p>
        <div className="space-y-2.5">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,99,35,0.5)]" />
              <span className="text-muted-foreground">Emitidos</span>
            </div>
            <span className="font-semibold text-foreground">+{emitidos.toLocaleString('pt-BR')}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_8px_rgba(232,118,44,0.5)]" />
              <span className="text-muted-foreground">Resgatados</span>
            </div>
            <span className="font-semibold text-accent">-{resgatados.toLocaleString('pt-BR')}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#f43f5e] shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
              <span className="text-muted-foreground">Expirados</span>
            </div>
            <span className="font-semibold text-rose-600 dark:text-rose-400">-{expirados.toLocaleString('pt-BR')}</span>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-border/50 flex justify-between items-center text-sm">
          <span className="font-medium text-foreground">Saldo Líquido</span>
          <span className={`font-bold ${saldoLiquido > 0 ? 'text-primary' : saldoLiquido < 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
            {saldoLiquido > 0 ? '+' : ''}{saldoLiquido.toLocaleString('pt-BR')}
          </span>
        </div>
      </div>
    )
  }
  return null
}

export function DashboardCharts({ data }: Props) {
  const sortedData = useMemo(() => 
    [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
  [data])

  const hasData = useMemo(() => 
    sortedData.some(d => d.emitidos > 0 || d.resgatados > 0 || d.expirados > 0),
  [sortedData])

  const chartConfig = {
    emitidos: { label: "Pontos Emitidos", color: "#006323" }, // primary
    resgatados: { label: "Pontos Resgatados", color: "#E8762C" }, // accent
    expirados: { label: "Pontos Expirados", color: "#f43f5e" }, // rose-500 (Rose/Red)
  }

  return (
    <Card className="col-span-1 lg:col-span-2 min-w-0 overflow-hidden border-border/40 shadow-sm transition-all hover:shadow-md bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">Fluxo de Pontos Diário</CardTitle>
            <CardDescription className="text-sm mt-1">Acompanhe o engajamento e a saúde financeira do seu programa</CardDescription>
          </div>
          {/* Custom Rich Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm ring-1 ring-primary/20" />
              <span className="font-medium text-muted-foreground">Emitidos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-sm ring-1 ring-accent/20" />
              <span className="font-medium text-muted-foreground">Resgatados</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#f43f5e] shadow-sm ring-1 ring-[#f43f5e]/20" />
              <span className="font-medium text-muted-foreground">Expirados</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-2 sm:px-6 pb-6">
        {!hasData ? (
          <div className="h-[350px] w-full flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-xl bg-muted/10">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-base font-medium text-foreground mb-1">Nenhum dado para o período</p>
            <p className="text-sm text-muted-foreground max-w-sm text-center">
              Não houve movimentação de pontos nos dias selecionados. Tente alterar o período no filtro acima.
            </p>
          </div>
        ) : (
          <div className="h-[350px] w-full mt-4">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <AreaChart data={sortedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillEmitidos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-emitidos)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-emitidos)" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="fillResgatados" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-resgatados)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-resgatados)" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="fillExpirados" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-expirados)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--color-expirados)" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.15} />
                
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => {
                    const date = new Date(val);
                    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
                  }}
                  className="text-xs font-medium fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  minTickGap={20}
                />
                
                <YAxis 
                  className="text-xs font-medium fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                  tickMargin={12}
                />
                
                <ChartTooltip 
                  cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }} 
                  content={<CustomTooltip />} 
                />
                
                {/* Ordem de renderização: Os de trás primeiro, os da frente por último */}
                <Area 
                  type="monotone" 
                  dataKey="emitidos" 
                  name="Emitidos"
                  stroke="var(--color-emitidos)" 
                  fill="url(#fillEmitidos)"
                  strokeWidth={2}
                  activeDot={{ r: 5, strokeWidth: 1.5, fill: 'var(--color-emitidos)', stroke: 'hsl(var(--background))' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="resgatados" 
                  name="Resgatados"
                  stroke="var(--color-resgatados)" 
                  fill="url(#fillResgatados)"
                  strokeWidth={2}
                  activeDot={{ r: 5, strokeWidth: 1.5, fill: 'var(--color-resgatados)', stroke: 'hsl(var(--background))' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="expirados" 
                  name="Expirados"
                  stroke="var(--color-expirados)" 
                  fill="url(#fillExpirados)"
                  strokeWidth={2}
                  activeDot={{ r: 4, strokeWidth: 1.5, fill: 'var(--color-expirados)', stroke: 'hsl(var(--background))' }}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
