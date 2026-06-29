import { PageContainer } from "@/components/layout/page-container"
import { CatalogoView } from "@/features/recompensas/components/catalogo-view"

export default function RecompensasPage() {
  return (
    <PageContainer
      title="Catálogo de Recompensas"
      description="Gerencie os prêmios disponíveis para resgate."
    >
      <CatalogoView />
    </PageContainer>
  )
}
