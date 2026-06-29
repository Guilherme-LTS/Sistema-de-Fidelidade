"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRecompensas } from "@/features/recompensas/hooks/use-recompensas"
import { useResgates } from "../hooks/use-resgates"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Gift } from "lucide-react"

const resgateSchema = z.object({
  rewardId: z.coerce.number().positive("Selecione um prêmio."),
})

type ResgateForm = z.infer<typeof resgateSchema>

interface ResgateModalProps {
  document: string
  pontosDisponiveis: number
}

export function ResgateModal({ document, pontosDisponiveis }: ResgateModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { recompensas, isLoading } = useRecompensas()
  const { resgatar } = useResgates()
  const [selectedRewardId, setSelectedRewardId] = useState<number | null>(null)

  const recompensasAtivas = recompensas.filter(r => r.isActive)

  const handleSubmit = () => {
    if (!selectedRewardId) return

    resgatar.mutate(
      { document, rewardId: selectedRewardId },
      {
        onSuccess: (data) => {
          setIsOpen(false)
          setSelectedRewardId(null)
          
          const saldoRestante = pontosDisponiveis - data.recompensa.pointsCost;
          
          toast.success("Resgate realizado com sucesso!", {
            description: (
              <div className="mt-2 space-y-1">
                <p><strong>Cliente:</strong> {data.cliente.nome}</p>
                <p><strong>Prêmio:</strong> {data.recompensa.name}</p>
                <p><strong>Pontos utilizados:</strong> {data.recompensa.pointsCost}</p>
                <p><strong>Saldo restante:</strong> {saldoRestante} pts</p>
              </div>
            ),
            duration: 5000,
          });
        },
        onError: (error: any) => {
          toast.error(error.message || "Erro ao realizar o resgate.");
        }
      }
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="w-full sm:w-auto">
          <Gift className="mr-2 h-4 w-4" /> Resgatar Prêmio
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Resgatar Prêmio</DialogTitle>
          <DialogDescription>
            Escolha o prêmio que o cliente deseja resgatar.
            <br />
            Saldo disponível: <strong className="text-emerald-600">{pontosDisponiveis} pts</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4 max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground">Carregando catálogo...</p>
          ) : recompensasAtivas.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">Nenhum prêmio ativo no momento.</p>
          ) : (
            recompensasAtivas.map(r => {
              const podePagar = pontosDisponiveis >= r.pointsCost
              const isSelected = selectedRewardId === r.id

              return (
                <div 
                  key={r.id}
                  onClick={() => podePagar && setSelectedRewardId(r.id)}
                  className={`
                    p-3 rounded-lg border-2 cursor-pointer transition-all
                    ${!podePagar ? "opacity-50 cursor-not-allowed bg-muted/50 border-transparent" : ""}
                    ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
                  `}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.description || "Sem descrição"}</p>
                    </div>
                    <div className={`font-bold text-sm ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                      {r.pointsCost} pts
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button 
            disabled={!selectedRewardId || resgatar.isPending} 
            onClick={handleSubmit}
          >
            {resgatar.isPending ? "Processando..." : "Confirmar Resgate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
