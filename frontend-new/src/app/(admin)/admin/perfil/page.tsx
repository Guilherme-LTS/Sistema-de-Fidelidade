import { Metadata } from "next"
import { PerfilView } from "@/features/perfil/components/perfil-view"

export const metadata: Metadata = {
  title: "Meu Perfil | Sistema de Fidelidade",
  description: "Gerencie seus dados pessoais e senha.",
}

export default function PerfilPage() {
  return <PerfilView />
}
