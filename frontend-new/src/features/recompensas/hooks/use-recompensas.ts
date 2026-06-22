import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { recompensasApi, CriarRecompensaDTO } from "../recompensas.api"

export const RECOMPENSAS_QUERY_KEY = ["recompensas"]

export function useRecompensas() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: RECOMPENSAS_QUERY_KEY,
    queryFn: recompensasApi.listar,
  })

  const criar = useMutation({
    mutationFn: recompensasApi.criar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECOMPENSAS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ["auditoria"] })
    },
  })

  const atualizar = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CriarRecompensaDTO> }) => 
      recompensasApi.atualizar(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECOMPENSAS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ["auditoria"] })
    },
  })

  const excluir = useMutation({
    mutationFn: recompensasApi.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECOMPENSAS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ["auditoria"] })
    },
  })

  return {
    recompensas: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    criar,
    atualizar,
    excluir,
  }
}
