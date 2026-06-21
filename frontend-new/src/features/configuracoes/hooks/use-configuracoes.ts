import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  getRestaurante,
  updateRestaurante,
  getUsuario,
  updateUsuario,
  getFidelidade,
  updateFidelidade,
  RestauranteInput,
  UsuarioInput,
  FidelidadeInput
} from "../configuracoes.api"

export function useRestaurante() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["configuracoes", "restaurante"],
    queryFn: getRestaurante,
  })

  const mutation = useMutation({
    mutationFn: (input: RestauranteInput) => updateRestaurante(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuracoes", "restaurante"] })
      queryClient.invalidateQueries({ queryKey: ["auth-profile"] })
      toast.success("Perfil do restaurante atualizado.")
    },
    onError: () => toast.error("Falha ao atualizar o restaurante.")
  })

  return { query, mutation }
}

export function useUsuario() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["configuracoes", "usuario"],
    queryFn: getUsuario,
  })

  const mutation = useMutation({
    mutationFn: (input: UsuarioInput) => updateUsuario(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuracoes", "usuario"] })
      toast.success("Perfil do usuário atualizado.")
    },
    onError: () => toast.error("Falha ao atualizar o perfil.")
  })

  return { query, mutation }
}

export function useFidelidadeConfig() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["configuracoes", "fidelidade"],
    queryFn: getFidelidade,
  })

  const mutation = useMutation({
    mutationFn: (input: FidelidadeInput) => updateFidelidade(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuracoes", "fidelidade"] })
      toast.success("Regras de fidelidade atualizadas.")
    },
    onError: () => toast.error("Falha ao atualizar regras.")
  })

  return { query, mutation }
}
