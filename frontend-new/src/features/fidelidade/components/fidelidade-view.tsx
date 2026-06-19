"use client"

import React from "react"
import { Header } from "@/components/dashboard/header"
import { LancamentoPontosForm } from "./lancamento-pontos-form"
import { ResgateRapidoPanel } from "./resgate-rapido-panel"

export function FidelidadeView() {
  return (
    <div className="space-y-6">
      <Header
        title="Programa de Fidelidade"
        description="Lance pontos, gerencie recompensas e acompanhe os resgates dos seus clientes."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <LancamentoPontosForm />
        </div>
        
        <div className="h-full">
          <ResgateRapidoPanel />
        </div>
      </div>
    </div>
  )
}
