import { Header } from "@/components/dashboard/header"
import { ConfiguracoesView } from "@/features/configuracoes/components/configuracoes-view"

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <Header
        title="Configurações"
        description="Gerencie os dados do restaurante, perfil de acesso e as regras do programa de fidelidade."
      />
      <ConfiguracoesView />
    </div>
  )
}
