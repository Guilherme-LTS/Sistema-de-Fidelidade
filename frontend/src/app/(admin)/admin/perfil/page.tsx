import { Metadata } from "next"
import { PerfilView } from "@/features/perfil/components/perfil-view"
import { PageContainer } from "@/components/layout/page-container"

export const metadata: Metadata = {
  title: "Meu Perfil | Sistema de Fidelidade",
  description: "Gerencie seus dados pessoais e senha.",
}

export default function PerfilPage() {
  return (
    <PageContainer
      title="Meu Perfil"
      description="Gerencie seus dados pessoais e configurações de acesso."
    >
      <PerfilView />
    </PageContainer>
  )
}
