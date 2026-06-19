import { api } from "@/lib/api/client"
import { UsuarioPerfil } from "@/lib/api/types"

export async function carregarPerfilAtual(): Promise<UsuarioPerfil> {
  const response = await api.get<{ success: boolean; data: UsuarioPerfil }>("/auth/me")
  return response.data
}
