import { api } from "@/lib/api/client"

export interface Usuario {
  id: string
  tenantId: string
  userId: string | null
  name: string
  email: string | null
  phone: string | null
  role: "admin" | "operador" | "novato"
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CriarUsuarioDTO {
  name: string
  email: string
  password?: string
  role: "admin" | "operador" | "novato"
}

export interface AtualizarUsuarioDTO {
  name?: string
  role?: "admin" | "operador" | "novato"
}

export const usuariosApi = {
  listar: async (): Promise<Usuario[]> => {
    const res = await api.get<{ success: boolean; data: Usuario[] }>("/usuarios")
    return res.data
  },

  criar: async (data: CriarUsuarioDTO): Promise<Usuario> => {
    const res = await api.post<{ success: boolean; data: Usuario }>("/usuarios", data)
    return res.data
  },

  atualizar: async (id: string, data: AtualizarUsuarioDTO): Promise<Usuario> => {
    const res = await api.put<{ success: boolean; data: Usuario }>(`/usuarios/${id}`, data)
    return res.data
  },

  alterarStatus: async (id: string, isActive: boolean): Promise<Usuario> => {
    const res = await api.patch<{ success: boolean; data: Usuario }>(`/usuarios/${id}/status`, { isActive })
    return res.data
  },

  excluir: async (id: string): Promise<void> => {
    await api.delete(`/usuarios/${id}`)
  },
}
