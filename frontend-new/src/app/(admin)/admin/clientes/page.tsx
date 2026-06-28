import { PageContainer } from "@/components/layout/page-container"
import { ClientesView } from "@/features/clientes/components/clientes-view"
import { Suspense } from "react"
import { Spinner } from "@/components/ui/spinner"

export default function ClientesPage() {
  return (
    <PageContainer
      title="Clientes"
      description="Gerencie seus clientes, visualize saldos e histórico de pontos."
    >
      <div className="mt-4 md:mt-5">
        <Suspense fallback={
          <div className="flex items-center justify-center h-96">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        }>
          <ClientesView />
        </Suspense>
      </div>
    </PageContainer>
  )
}
