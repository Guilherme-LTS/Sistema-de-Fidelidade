"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Gift } from "lucide-react"

import { PerfilRestauranteTab } from "./tabs/perfil-restaurante-tab"
import { ProgramaFidelidadeTab } from "./tabs/programa-fidelidade-tab"

export function ConfiguracoesView() {
  return (
    <div className="w-full">
      <Tabs defaultValue="restaurante" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="restaurante" className="data-[state=active]:bg-background">
            <Building2 className="w-4 h-4 mr-2" />
            Perfil do Restaurante
          </TabsTrigger>

          <TabsTrigger value="fidelidade" className="data-[state=active]:bg-background">
            <Gift className="w-4 h-4 mr-2" />
            Programa de Fidelidade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="restaurante" className="focus-visible:outline-none">
          <PerfilRestauranteTab />
        </TabsContent>


        <TabsContent value="fidelidade" className="focus-visible:outline-none">
          <ProgramaFidelidadeTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
