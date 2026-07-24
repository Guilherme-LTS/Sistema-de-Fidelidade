import React from "react"
import { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"
import { ConsumerAuthForm } from "@/features/consumer/components/consumer-auth-form"

export const metadata: Metadata = {
  title: "Acesso do Consumidor | Pontus",
  description: "Acesse seus pontos e recompensas em todos os estabelecimentos parceiros.",
}

export default function AcessoConsumidorPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Mesh Gradient Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute top-[60%] -right-[10%] w-[50%] h-[50%] rounded-full bg-accent/5 blur-[100px]" />
      </div>

      {/* Botão voltar genérico */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10">
        <Link href="/" className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Link>
      </div>

      <div className="w-full max-w-[420px] space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className="mx-auto flex justify-center mb-8">
            <Image src="/logo-light.png" alt="Pontus Logo" width={200} height={55} className="dark:hidden" priority  style={{ width: "auto", height: "auto" }} />
            <Image src="/logo-dark.png" alt="Pontus Logo" width={200} height={55} className="hidden dark:block" priority  style={{ width: "auto", height: "auto" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Acesse sua conta</h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Consulte seu saldo e resgate prêmios em parceiros.
            </p>
          </div>
        </div>

        <div className="w-full">
          <React.Suspense fallback={<div className="flex justify-center p-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
            <ConsumerAuthForm tenantName="Geral" />
          </React.Suspense>
        </div>
      </div>
    </div>
  )
}
