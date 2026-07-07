"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { carregarConvites, aceitarConvite, recusarConvite } from "@/features/auth/auth.api"
import { useAuth } from "@/lib/auth/auth-context"
import { toast } from "sonner"
import { Store, UserPlus, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PendingInvitations() {
  const queryClient = useQueryClient()
  const { refreshTenants } = useAuth()

  // Busca convites pendentes
  const { data: invitations = [], refetch } = useQuery({
    queryKey: ["auth-invitations"],
    queryFn: carregarConvites,
    refetchInterval: 1000 * 30, // Poll every 30s
  })

  // Mutação para aceitar
  const acceptMutation = useMutation({
    mutationFn: aceitarConvite,
    onSuccess: async (res) => {
      toast.success(res.message || "Convite aceito com sucesso!")
      await refreshTenants() // Atualiza a lista de workspaces no switcher
      queryClient.invalidateQueries({ queryKey: ["auth-invitations"] })
      refetch()
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao aceitar convite.")
    },
  })

  // Mutação para recusar
  const declineMutation = useMutation({
    mutationFn: recusarConvite,
    onSuccess: async (res) => {
      toast.success(res.message || "Convite recusado.")
      queryClient.invalidateQueries({ queryKey: ["auth-invitations"] })
      refetch()
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao recusar convite.")
    },
  })

  if (invitations.length === 0) {
    return null
  }

  return (
    <div className="space-y-3 mb-6 animate-in fade-in slide-in-from-top-3 duration-300">
      {invitations.map((invite) => (
        <div 
          key={invite.id} 
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-primary/20 bg-primary/5 text-foreground shadow-sm shadow-primary/5"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h4 className="text-sm font-semibold text-foreground">Convite Pendente</h4>
              <p className="text-xs text-muted-foreground">
                Você foi convidado para a equipe do restaurante <strong className="text-primary font-medium">{invite.tenantName}</strong> como <span className="capitalize text-foreground font-medium">{invite.role}</span>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
            <Button
              size="sm"
              variant="outline"
              disabled={acceptMutation.isPending || declineMutation.isPending}
              onClick={() => declineMutation.mutate(invite.id)}
              className="h-8.5 px-3 border-border/80 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 text-xs gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Recusar
            </Button>
            <Button
              size="sm"
              disabled={acceptMutation.isPending || declineMutation.isPending}
              onClick={() => acceptMutation.mutate(invite.id)}
              className="h-8.5 px-3.5 text-xs gap-1.5 shadow-sm"
            >
              <Check className="h-3.5 w-3.5" />
              Aceitar Acesso
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
