import { ArrowUpRight, RefreshCcw, Shield, Trash } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RecentActivity as RecentActivityType } from "@/lib/api/types"

interface Props {
  activities: RecentActivityType[]
}

export function RecentActivity({ activities }: Props) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Últimas Movimentações</CardTitle>
        <CardDescription>O que aconteceu de mais recente no seu programa</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
        ) : (
          <div className="space-y-4">
            {activities.map((act) => {
              let Icon = Shield;
              let iconColor = "text-slate-500";
              let bg = "bg-slate-500/10";
              let text = act.action;

              if (act.action === "POINTS_EARNED") {
                Icon = ArrowUpRight;
                iconColor = "text-emerald-500";
                bg = "bg-emerald-500/10";
                text = "Lançamento de Pontos";
              } else if (act.action === "REWARD_REDEEMED") {
                Icon = RefreshCcw;
                iconColor = "text-blue-500";
                bg = "bg-blue-500/10";
                text = "Resgate Realizado";
              } else if (act.action === "POINTS_EXPIRED") {
                Icon = Trash;
                iconColor = "text-rose-500";
                bg = "bg-rose-500/10";
                text = "Expiração de Pontos";
              }

              return (
                <div key={act.id} className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${bg}`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{text}</p>
                    <p className="text-xs text-muted-foreground">
                      {act.createdAt 
                        ? new Date(act.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                          })
                        : "Desconhecido"}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
