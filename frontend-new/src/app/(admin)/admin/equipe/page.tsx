import { Metadata } from "next"
import { UsuariosView } from "@/features/usuarios/components/usuarios-view"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { PageContainer } from "@/components/layout/page-container"

export const metadata: Metadata = {
  title: "Equipe | Sistema de Fidelidade",
  description: "Gestão de acessos e usuários da equipe",
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export default function EquipePage() {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <PageContainer
        title="Equipe"
        description="Gerencie os acessos e permissões dos funcionários do restaurante."
      >
        <UsuariosView />
      </PageContainer>
    </AuthGuard>
  )
}
