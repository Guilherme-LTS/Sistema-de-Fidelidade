import { Metadata } from "next"
import { UsuariosView } from "@/features/usuarios/components/usuarios-view"
import { AuthGuard } from "@/features/auth/components/auth-guard"

export const metadata: Metadata = {
  title: "Equipe | Sistema de Fidelidade",
  description: "Gestão de acessos e usuários da equipe",
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export default function EquipePage() {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <div className="flex flex-col gap-6 w-full mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipe</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os acessos e permissões dos funcionários do restaurante.
          </p>
        </div>
        <UsuariosView />
      </div>
    </AuthGuard>
  )
}
