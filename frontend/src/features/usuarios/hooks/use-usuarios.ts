import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { usuariosApi, CriarUsuarioDTO, AtualizarUsuarioDTO } from "../usuarios.api"
import { toast } from "sonner"

export const USUARIOS_QUERY_KEY = ["usuarios"]

export function useUsuarios() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: USUARIOS_QUERY_KEY,
    queryFn: usuariosApi.listar,
  })

  const criar = useMutation({
    mutationFn: (data: CriarUsuarioDTO) => usuariosApi.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USUARIOS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ["auditoria"] })
      toast.success("Usuário criado com sucesso")
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar usuário")
    },
  })

  const atualizar = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AtualizarUsuarioDTO }) => usuariosApi.atualizar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USUARIOS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ["auditoria"] })
      toast.success("Usuário atualizado com sucesso")
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar usuário")
    },
  })

  const alterarStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => usuariosApi.alterarStatus(id, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: USUARIOS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ["auditoria"] })
      toast.success(`Usuário ${variables.isActive ? "ativado" : "desativado"} com sucesso`)
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao alterar status do usuário")
    },
  })

  const excluir = useMutation({
    mutationFn: (id: string) => usuariosApi.excluir(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USUARIOS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ["auditoria"] })
      toast.success("Usuário excluído com sucesso")
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao excluir usuário")
    },
  })

  return {
    query,
    criar,
    atualizar,
    alterarStatus,
    excluir,
  }
}
