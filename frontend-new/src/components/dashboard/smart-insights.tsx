import { Lightbulb, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { DashboardStats } from "@/lib/api/types"
import { Progress } from "@/components/ui/progress"

interface Props {
  stats: DashboardStats
}

export function SmartInsights({ stats }: Props) {
  const taxaResgate = stats.pontos.emitidos > 0 
    ? ((stats.pontos.resgatados / stats.pontos.emitidos) * 100).toFixed(1)
    : "0.0";
    
  return (
    <Card className="border-l-4 border-l-primary bg-primary/5 shadow-sm relative overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="flex items-start gap-4 flex-1">
            <div className="mt-1 bg-primary/20 p-2 rounded-full shrink-0">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-primary">Insights Inteligentes</h4>
              <ul className="text-sm text-foreground/80 space-y-2 list-disc list-inside pt-2">
                {stats.clientes.novosMes > 0 && (
                  <li>Você cadastrou <strong>{stats.clientes.novosMes} novos clientes</strong> neste período. 
                  {stats.clientes.crescimento > 0 ? " Isso é um ótimo crescimento!" : ""}</li>
                )}
                {stats.recompensas.topRecompensas && stats.recompensas.topRecompensas.length > 0 && (
                  <li>A recompensa favorita é <strong>{stats.recompensas.topRecompensas[0].name}</strong> com {stats.recompensas.topRecompensas[0].resgates} resgates.</li>
                )}
                {stats.pontos.expirados > 0 && (
                  <li>Você teve <strong>{stats.pontos.expirados.toLocaleString("pt-BR")} pontos expirados</strong> recentemente. Tente engajar mais a sua base!</li>
                )}
              </ul>
            </div>
          </div>
          
          {/* Box de Taxa de Resgate */}
          <div className="bg-background rounded-lg p-4 border shadow-sm w-full md:w-64 shrink-0">
            <h5 className="text-sm font-medium mb-2 text-muted-foreground">Taxa de Resgate (Saúde)</h5>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-bold">{taxaResgate}%</span>
              <span className="text-xs text-muted-foreground mb-1">ideal: {'>'} 20%</span>
            </div>
            <Progress value={Number(taxaResgate)} className="h-2" />
          </div>
        </div>

        {/* Alerta de Expiração Iminente */}
        {stats.pontos.expirandoEmBreve > 0 && (
          <div className="mt-4 bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 rounded-md p-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>Atenção:</strong> Existem <strong>{stats.pontos.expirandoEmBreve.toLocaleString("pt-BR")} pontos</strong> na carteira dos seus clientes que irão expirar nos próximos 30 dias. Esta é uma excelente oportunidade para disparar campanhas promocionais (SMS/WhatsApp) incentivando uma visita à loja.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
