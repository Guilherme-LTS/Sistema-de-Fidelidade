"use client"

import React from "react"
import { Header } from "@/components/dashboard/header"
import { LancamentoPontosForm } from "./lancamento-pontos-form"
import { ResgateRapidoPanel } from "./resgate-rapido-panel"
import { ConsultaPontosPanel } from "./consulta-pontos-panel"
import { useAuth } from "@/lib/auth/auth-context"

export function FidelidadeView() {
  const { user } = useAuth()
  const isNovato = user?.role === "novato"
  return (
    <div className="space-y-6">
      <Header
        title="Programa de Fidelidade"
        description="Lance pontos, gerencie recompensas e acompanhe os resgates dos seus clientes."
      />

      <div className={`grid grid-cols-1 ${!isNovato ? 'lg:grid-cols-2' : ''} gap-6`}>
        {!isNovato && (
          <div>
            <LancamentoPontosForm />
          </div>
        )}
        
        <div className="h-full w-full">
          <ResgateRapidoPanel />
        </div>
      </div>

      <div className="mt-6">
        <ConsultaPontosPanel />
      </div>
    </div>
  )
}
