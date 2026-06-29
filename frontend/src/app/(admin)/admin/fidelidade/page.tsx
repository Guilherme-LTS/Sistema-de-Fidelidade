import { PageContainer } from "@/components/layout/page-container"
import { FidelidadeView } from "@/features/fidelidade/components/fidelidade-view"

export default function FidelidadePage() {
  return (
    <PageContainer
      title="Programa de Fidelidade"
      description="Lance pontos, gerencie recompensas e acompanhe os resgates dos seus clientes."
    >
      <FidelidadeView />
    </PageContainer>
  )
}
