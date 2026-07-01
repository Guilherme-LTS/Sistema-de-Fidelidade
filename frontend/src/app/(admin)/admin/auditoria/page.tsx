import { Metadata } from "next"
import { AuditoriaView } from "@/features/auditoria/components/auditoria-view"

export const metadata: Metadata = {
  title: "Auditoria | Sistema de Fidelidade",
  description: "Registro de eventos e log de auditoria",
}

export const dynamic = "force-dynamic"
export const revalidate = 0

import { AuthGuard } from "@/features/auth/components/auth-guard"
import { PageContainer } from "@/components/layout/page-container"

export default function AuditoriaPage() {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <AuditoriaView />
    </AuthGuard>
  )
}
