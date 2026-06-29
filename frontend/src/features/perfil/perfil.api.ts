import { apiRequest } from "@/lib/api/client"

export interface PerfilInput {
  name: string
  phone?: string
}

export async function updatePerfil(input: PerfilInput) {
  const res = await apiRequest<{ success: boolean; message: string }>("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(input)
  })
  return res
}
