import { PageContainer } from "@/components/layout/page-container"
import { ConfiguracoesView } from "@/features/configuracoes/components/configuracoes-view"
import { AuthGuard } from "@/features/auth/components/auth-guard"

export default function ConfiguracoesPage() {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <PageContainer
        title="Configurações"
        description="Gerencie os dados do estabelecimento, perfil de acesso e as regras do programa de fidelidade."
      >
        <ConfiguracoesView />
      </PageContainer>
    </AuthGuard>
  )
}
