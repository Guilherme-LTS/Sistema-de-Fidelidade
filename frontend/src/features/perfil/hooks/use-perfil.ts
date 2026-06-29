import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { updatePerfil, PerfilInput } from "../perfil.api"
import { useAuth } from "@/lib/auth/auth-context"

export function usePerfil() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (input: PerfilInput) => updatePerfil(input),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["auth-profile"] })
      queryClient.invalidateQueries({ queryKey: ["auditoria"] })
      toast.success("Perfil atualizado com sucesso.")
    },
    onError: (error: any) => {
      toast.error(error.message || "Falha ao atualizar o perfil.")
    }
  })

  return { mutation }
}
