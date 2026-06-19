import { useMutation, useQueryClient } from "@tanstack/react-query"
import { resgatesApi, ResgatarPremioDTO } from "../resgates.api"

export function useResgates() {
  const queryClient = useQueryClient()

  const resgatar = useMutation({
    mutationFn: resgatesApi.resgatar,
    onSuccess: (data, variables) => {
      // Invalida os dados do cliente para forçar o recarregamento do saldo e do extrato
      queryClient.invalidateQueries({ queryKey: ["clientes"] })
      queryClient.invalidateQueries({ queryKey: ["cliente-extrato", variables.document.replace(/\D/g, "")] })
    },
  })

  return {
    resgatar,
  }
}
