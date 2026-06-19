"use client"

import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Trophy, User } from "lucide-react"
import { RecentCliente } from "@/lib/api/types"
import { Skeleton } from "@/components/ui/skeleton"

interface TeamCollaborationProps {
  clients: RecentCliente[]
  loading: boolean
}

export function TeamCollaboration({ clients, loading }: TeamCollaborationProps) {
  if (loading) {
    return (
      <Card className="p-6 border border-border/60 shadow-md">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-6 w-32 bg-muted-foreground/10" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              <Skeleton className="w-10 h-10 rounded-full bg-muted-foreground/10" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32 bg-muted-foreground/10" />
                <Skeleton className="h-3 w-24 bg-muted-foreground/10" />
              </div>
              <Skeleton className="h-6 w-16 bg-muted-foreground/10" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card
      className="p-6 transition-all duration-500 hover:shadow-xl animate-slide-in-up border border-border/50"
      style={{ animationDelay: "600ms" }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Melhores Clientes
          </h2>
          <p className="text-xs text-muted-foreground">Clientes com maior saldo de pontos</p>
        </div>
      </div>
      
      <div className="space-y-3">
        {clients.length > 0 ? (
          clients.map((cliente, index) => {
            const initials = cliente.nome
              ? cliente.nome
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "C"

            return (
              <div
                key={cliente.document || index}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-secondary/40 border border-transparent hover:border-border/30 transition-all duration-300 cursor-pointer group"
              >
                <Avatar className="w-10 h-10 ring-2 ring-primary/10 transition-all duration-300 group-hover:ring-primary/30 group-hover:scale-105">
                  <AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold">
                    {initials || <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{cliente.nome || "Cliente Anônimo"}</p>
                  <p className="text-xs text-muted-foreground">
                    Doc: <span className="font-medium">{cliente.document || "Não informado"}</span>
                  </p>
                </div>
                
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs px-2.5 py-1 rounded-lg font-bold transition-all duration-300 group-hover:scale-105 whitespace-nowrap">
                  {cliente.saldo_pontos} pts
                </span>
              </div>
            )
          })
        ) : (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Nenhum cliente registrado.
          </div>
        )}
      </div>
    </Card>
  )
}
