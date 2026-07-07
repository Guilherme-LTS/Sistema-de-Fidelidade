import { Users, Coins, ArrowUpRight, ArrowDownRight, RefreshCcw, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardStats } from "@/lib/api/types"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Props {
  stats: DashboardStats
}

function GrowthBadge({ growth, invert = false }: { growth: number | undefined | null, invert?: boolean }) {
  if (growth === undefined || growth === null || isNaN(growth)) {
    return <span className="text-muted-foreground font-medium text-xs">Sem histórico</span>;
  }
  
  if (growth === 0) return <span className="text-muted-foreground font-medium text-xs">Estável</span>;
  
  // Para expirações, crescimento é ruim (invert = true)
  const isPositive = growth > 0;
  const isGood = invert ? !isPositive : isPositive;
  
  const color = isGood ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10";
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {Math.abs(growth)}%
    </span>
  )
}

export function DashboardStatsCards({ stats }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-card hover:bg-muted/50 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clientes Cadastrados</CardTitle>
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-blue-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.clientes.total}</div>
          <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 break-words">
            <GrowthBadge growth={stats.clientes.crescimento} />
            <span>em relação ao período anterior</span>
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card hover:bg-muted/50 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pontos em Circulação</CardTitle>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Coins className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pontos.saldoCirculante.toLocaleString("pt-BR")}</div>
          <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-1 break-words">
            <Activity className="h-3 w-3" />
            Saldo atual disponível nas carteiras
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card hover:bg-muted/50 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pontos Resgatados</CardTitle>
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <RefreshCcw className="h-4 w-4 text-emerald-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pontos.resgatados.toLocaleString("pt-BR")}</div>
          <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 break-words">
            <GrowthBadge growth={stats.pontos.resgatadosCrescimento} />
            <span>({stats.recompensas.resgatesMes} prêmios)</span>
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card hover:bg-muted/50 transition-colors relative overflow-hidden">
        {stats.pontos.expirandoEmBreve > 0 && (
          <div className="absolute top-0 right-0 w-2 h-full bg-rose-500" />
        )}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pontos Expirados</CardTitle>
          <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
            <ArrowDownRight className="h-4 w-4 text-rose-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pontos.expirados.toLocaleString("pt-BR")}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap break-words">
            <GrowthBadge growth={stats.pontos.expiradosCrescimento} invert={true} />
            {stats.pontos.expirandoEmBreve > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-rose-500 font-medium cursor-help underline decoration-rose-500/30 underline-offset-2">
                      {stats.pontos.expirandoEmBreve.toLocaleString("pt-BR")} a expirar
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total de pontos que perderão a validade nos próximos 30 dias.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
