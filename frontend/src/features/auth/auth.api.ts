import { api } from "@/lib/api/client"
import { UsuarioPerfil } from "@/lib/api/types"

export async function carregarPerfilAtual(): Promise<UsuarioPerfil> {
  const response = await api.get<{ success: boolean; data: UsuarioPerfil }>("/auth/me")
  return response.data
}

export interface UserTenant {
  tenantUserId: string
  tenantId: string
  tenantName: string
  tenantLogoUrl?: string | null
  role: string
}

export interface UserInvitation {
  id: string
  tenantName: string
  tenantLogoUrl?: string | null
  role: string
  createdAt: string
}

export async function carregarTenants(): Promise<UserTenant[]> {
  const response = await api.get<{ success: boolean; data: UserTenant[] }>("/auth/tenants")
  return response.data
}

export async function carregarConvites(): Promise<UserInvitation[]> {
  const response = await api.get<{ success: boolean; data: UserInvitation[] }>("/auth/invitations")
  return response.data
}

export async function aceitarConvite(id: string): Promise<{ success: boolean; message: string }> {
  return api.post<{ success: boolean; message: string }>(`/auth/invitations/${id}/accept`)
}

export async function recusarConvite(id: string): Promise<{ success: boolean; message: string }> {
  return api.post<{ success: boolean; message: string }>(`/auth/invitations/${id}/decline`)
}

export interface PublicInvitation {
  email: string
  role: string
  tenantName: string
  tenantLogoUrl?: string | null
}

export async function obterConvitePublico(token: string): Promise<PublicInvitation> {
  const response = await api.get<{ success: boolean; data: PublicInvitation }>(`/auth/invitations/public/${token}`)
  return response.data
}

