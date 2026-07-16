import { PageContainer } from "@/components/layout/page-container"
import { AssinaturaView } from "@/features/assinatura/components/assinatura-view"
import { AuthGuard } from "@/features/auth/components/auth-guard"

export default function AssinaturaPage() {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <PageContainer
        title="Assinatura"
        description="Gerencie seu plano, faturamento atual, limites operacionais e histórico de faturas."
      >
        <AssinaturaView />
      </PageContainer>
    </AuthGuard>
  )
}
