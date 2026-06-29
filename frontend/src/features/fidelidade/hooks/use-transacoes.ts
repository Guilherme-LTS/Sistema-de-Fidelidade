import { useMutation, useQueryClient } from "@tanstack/react-query"
import { lancarPontos, LancarPontosInput, LancarPontosResponse } from "../transacoes.api"
import { toast } from "sonner"

export function useLancarPontos() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: LancarPontosInput) => lancarPontos(input),
    onSuccess: (data: LancarPontosResponse) => {
      toast.success(`Foram creditados ${data.pontosGanhos} pontos para o cliente ${data.cliente.nome || data.cliente.document}.`)
      // Invalidate both lists and specific customer queries
      queryClient.invalidateQueries({ queryKey: ["clientes"] })
      queryClient.invalidateQueries({ queryKey: ["cliente-extrato", data.cliente.document] })
      queryClient.invalidateQueries({ queryKey: ["auditoria"] })
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao lançar pontos.")
    },
  })
}
