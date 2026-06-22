import { Metadata } from "next"
import { AuditoriaView } from "@/features/auditoria/components/auditoria-view"

export const metadata: Metadata = {
  title: "Auditoria | Sistema de Fidelidade",
  description: "Registro de eventos e log de auditoria",
}

export const dynamic = "force-dynamic"
export const revalidate = 0

import { AuthGuard } from "@/features/auth/components/auth-guard"

export default function AuditoriaPage() {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auditoria</h1>
          <p className="text-muted-foreground mt-2">
            Histórico de eventos, logs de segurança e alterações no sistema.
          </p>
        </div>
        <AuditoriaView />
      </div>
    </AuthGuard>
  )
}
