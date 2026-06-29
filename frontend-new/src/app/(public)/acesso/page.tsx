import { Metadata } from "next"
import Link from "next/link"
import { Gift, ArrowLeft } from "lucide-react"
import { ConsumerAuthForm } from "@/features/consumer/components/consumer-auth-form"

export const metadata: Metadata = {
  title: "Acesso do Consumidor | FidelidadePro",
  description: "Acesse seus pontos e recompensas em todos os restaurantes parceiros.",
}

export default function AcessoConsumidorPage() {
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4 relative">
      
      {/* Botão voltar genérico */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8">
        <Link href="/" className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o início
        </Link>
      </div>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Gift className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Meus Pontos</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Consulte seu saldo e resgate prêmios nos parceiros.
            </p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl shadow-xl border border-border">
          {/* Reutilizamos o form, mas tenantName é genérico aqui, ou passamos null se a props permitir */}
          <ConsumerAuthForm tenantName="Geral" />
        </div>
        
        <p className="text-center text-sm text-muted-foreground">
          É dono de restaurante?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Entrar no painel do lojista
          </Link>
        </p>
      </div>
    </div>
  )
}
