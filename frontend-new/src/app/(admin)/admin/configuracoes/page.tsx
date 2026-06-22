import { Header } from "@/components/dashboard/header"
import { ConfiguracoesView } from "@/features/configuracoes/components/configuracoes-view"
import { AuthGuard } from "@/features/auth/components/auth-guard"

export default function ConfiguracoesPage() {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <Header
          title="Configurações"
          description="Gerencie os dados do restaurante, perfil de acesso e as regras do programa de fidelidade."
        />
        <ConfiguracoesView />
      </div>
    </AuthGuard>
  )
}
