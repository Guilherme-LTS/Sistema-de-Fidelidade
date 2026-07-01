import { ArrowUpRight, RefreshCcw, Shield, Trash } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RecentActivity as RecentActivityType } from "@/lib/api/types"

const actionTranslations: Record<string, string> = {
  LOGIN: "Login no Sistema",
  LOGOUT: "Logout do Sistema",
  CREATE_CUSTOMER: "Cadastro de Cliente",
  UPDATE_CUSTOMER: "Atualização de Cliente",
  DELETE_CUSTOMER: "Exclusão de Cliente",
  ADD_POINTS: "Lançamento de Pontos",
  REDEEM_REWARD: "Resgate de Recompensa",
  CREATE_REWARD: "Criação de Recompensa",
  UPDATE_REWARD: "Atualização de Recompensa",
  DELETE_REWARD: "Exclusão de Recompensa",
  UPDATE_CONFIG: "Configurações Alteradas",
  UPDATE_USER: "Alteração de Perfil de Usuário",
  DELETE_USER: "Exclusão de Usuário",
  POINTS_EXPIRED: "Pontos Expirados",
  CREATE_USER: "Usuário Criado",
  UPDATE_PASSWORD: "Senha Alterada",
  ACTIVATE_USER: "Usuário Ativado",
  DEACTIVATE_USER: "Usuário Desativado",
  POINTS_EARNED: "Lançamento de Pontos",
  REWARD_REDEEMED: "Resgate Realizado",
}

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
              let text = actionTranslations[act.action] || act.action;

              if (act.action === "POINTS_EARNED" || act.action === "ADD_POINTS") {
                Icon = ArrowUpRight;
                iconColor = "text-primary";
                bg = "bg-primary/10";
              } else if (act.action === "REWARD_REDEEMED" || act.action === "REDEEM_REWARD") {
                Icon = RefreshCcw;
                iconColor = "text-accent";
                bg = "bg-accent/10";
              } else if (act.action === "POINTS_EXPIRED") {
                Icon = Trash;
                iconColor = "text-rose-500";
                bg = "bg-rose-500/10";
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
