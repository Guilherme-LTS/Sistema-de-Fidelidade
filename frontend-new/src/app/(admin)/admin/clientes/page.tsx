import { Header } from "@/components/dashboard/header"
import { ClientesView } from "@/features/clientes/components/clientes-view"
import { Suspense } from "react"
import { Spinner } from "@/components/ui/spinner"

export default function ClientesPage() {
  return (
    <>
      <Header
        title="Clientes"
        description="Base para a futura gestao de clientes, saldos e historico de pontos."
      />
      <div className="mt-4 md:mt-5">
        <Suspense fallback={
          <div className="flex items-center justify-center h-96">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        }>
          <ClientesView />
        </Suspense>
      </div>
    </>
  )
}
