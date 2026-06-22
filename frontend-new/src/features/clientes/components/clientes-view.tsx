"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { toast } from "sonner"
import { useDebounce } from "@/hooks/use-debounce"
import { useClientes, useClienteComExtrato } from "../hooks/use-clientes"
import { Cliente, limparCpf } from "../clientes.api"
import { ClienteModal } from "./cliente-modal"
import { ResgateModal } from "@/features/resgates/components/resgate-modal"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { 
  Search, 
  Users, 
  ChevronRight, 
  Award, 
  Clock, 
  AlertTriangle,
  FileText,
  Edit2
} from "lucide-react"
import { cn } from "@/lib/utils"

const formatarData = (dataISO?: string | null) => {
  if (!dataISO) return ""
  try {
    const data = new Date(dataISO)
    return data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch (e) {
    return dataISO
  }
}

export function ClientesView() {
  // Estados de busca e paginação
  const [termoBusca, setTermoBusca] = useState("")
  const debouncedBusca = useDebounce(termoBusca, 500)
  const [paginaAtual, setPaginaAtual] = useState(1)
  
  // Documento selecionado (CPF)
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)
  
  // Modal de edição
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Resetar página quando a busca mudar
  useEffect(() => {
    setPaginaAtual(1)
  }, [debouncedBusca])

  // React Query para listar clientes
  const { 
    data: listData, 
    isLoading: isLoadingList, 
    error: listError 
  } = useClientes({ 
    busca: debouncedBusca, 
    page: paginaAtual 
  })

  // Tratar erro de listagem
  useEffect(() => {
    if (listError) {
      console.error(listError)
      toast.error("Erro ao carregar lista de clientes.")
    }
  }, [listError])

  // React Query para buscar dados e extrato do cliente selecionado
  const { 
    data: detailsData, 
    isLoading: isLoadingDetails, 
    error: detailsError 
  } = useClienteComExtrato(selectedDoc)

  // Tratar erro do extrato
  useEffect(() => {
    if (detailsError) {
      console.error(detailsError)
      toast.error("Erro ao carregar detalhes e extrato do cliente.")
    }
  }, [detailsError])

  const handleSelectCliente = useCallback((cliente: Cliente) => {
    const cleanDoc = limparCpf(cliente.document)
    setSelectedDoc(cleanDoc)
  }, [])

  // Prepara lista de clientes a exibir
  const clientesExibidos = useMemo(() => {
    const list = listData?.clientes || []
    
    // Se temos um cliente selecionado nos detalhes e ele não está na página atual,
    // nós o adicionamos no início para melhor experiência do usuário
    if (detailsData?.cliente) {
      const activeCliente = detailsData.cliente
      const isAlreadyInList = list.some(
        (c) => c.id === activeCliente.id || limparCpf(c.document) === limparCpf(activeCliente.document)
      )
      if (!isAlreadyInList) {
        return [activeCliente, ...list]
      }
    }
    
    return list
  }, [listData, detailsData])

  const clienteAtivo = detailsData?.cliente || null
  const extratoAtivo = detailsData?.extrato || []
  const totalPaginas = listData?.totalPaginas || 1

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Barra de Filtros / Ações */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-card p-4 rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Pesquisa e Filtros</span>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="busca-cliente"
              type="text"
              className="pl-9 h-9 text-sm bg-background border-border transition-all duration-300 focus:shadow-md focus:shadow-primary/5 focus:border-primary"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Buscar por nome ou CPF..."
            />
          </div>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
        {/* Painel da Esquerda: Lista de Resultados (col-span-4) */}
        <Card className="lg:col-span-4 flex flex-col h-[600px] border-border bg-card overflow-hidden">
          <CardHeader className="py-4 border-b border-border bg-muted/30">
            <CardTitle className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Resultados ({clientesExibidos.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0 flex flex-col justify-between">
            <div>
              {isLoadingList && clientesExibidos.length === 0 ? (
                <div className="flex justify-center items-center h-48">
                  <Spinner className="h-6 w-6 text-primary" />
                </div>
              ) : clientesExibidos.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Nenhum cliente encontrado.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {clientesExibidos.map((cliente) => {
                    const isSelected = selectedDoc === limparCpf(cliente.document)
                    return (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() => handleSelectCliente(cliente)}
                        className={cn(
                          "w-full text-left p-4 hover:bg-muted/50 transition-all duration-200 flex items-center justify-between group border-l-2 cursor-pointer",
                          isSelected 
                            ? "bg-primary/5 border-l-primary" 
                            : "border-l-transparent"
                        )}
                      >
                        <div className="space-y-1">
                          <p className={cn(
                            "text-sm font-semibold transition-colors",
                            isSelected ? "text-primary" : "text-foreground group-hover:text-primary"
                          )}>
                            {cliente.nome || "Nome não cadastrado"}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {cliente.document}
                          </p>
                        </div>
                        <ChevronRight className={cn(
                          "h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary",
                          isSelected && "text-primary translate-x-1"
                        )} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaAtual((prev) => Math.max(prev - 1, 1))}
                  disabled={paginaAtual === 1 || isLoadingList}
                  className="h-8 text-xs cursor-pointer"
                >
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground font-medium">
                  Página {paginaAtual} de {totalPaginas}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaAtual((prev) => Math.min(prev + 1, totalPaginas))}
                  disabled={paginaAtual === totalPaginas || isLoadingList}
                  className="h-8 text-xs cursor-pointer"
                >
                  Próxima
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Painel da Direita: Detalhes do Cliente e Extrato (col-span-8) */}
        <Card className="lg:col-span-8 flex flex-col min-h-[600px] border-border bg-card overflow-hidden">
          {isLoadingDetails ? (
            <div className="flex-1 flex justify-center items-center h-96">
              <Spinner className="h-8 w-8 text-primary" />
            </div>
          ) : clienteAtivo ? (
            <div className="flex flex-col h-full animate-fade-in">
              <CardHeader className="border-b border-border bg-muted/10 pb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
                      {clienteAtivo.nome || `CPF ${clienteAtivo.document}`}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setIsModalOpen(true)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm mt-1">
                      CPF: <span className="font-mono">{clienteAtivo.document}</span> • ID: #{clienteAtivo.id}
                    </CardDescription>
                  </div>
                  <ResgateModal 
                    document={clienteAtivo.document} 
                    pontosDisponiveis={clienteAtivo.pontosDisponiveis ?? 0} 
                  />
                </div>

                {/* Cards de Métricas Rápidas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
                  {/* Pontos Disponíveis */}
                  <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Pontos Disponíveis</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-0.5">
                        {clienteAtivo.pontosDisponiveis ?? 0}
                      </p>
                    </div>
                  </div>

                  {/* Pontos Pendentes */}
                  <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Pontos Pendentes</p>
                      <p className="text-2xl font-bold text-amber-500 mt-0.5">
                        {clienteAtivo.pontosPendentes ?? 0}
                      </p>
                    </div>
                  </div>

                  {/* Pontos Expirando */}
                  <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-rose-500/10 rounded-lg text-rose-600">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground">Pontos Expirando</p>
                      <p className="text-2xl font-bold text-rose-500 mt-0.5">
                        {clienteAtivo.pontosExpirando ?? 0}
                      </p>
                      {clienteAtivo.dataProximaExpiracao && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                          Expira em: {formatarData(clienteAtivo.dataProximaExpiracao)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 md:p-6 flex-1">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                      Extrato de Movimentações
                    </h3>
                  </div>

                  {extratoAtivo.length === 0 ? (
                    <div className="text-center p-12 text-muted-foreground border border-dashed border-border rounded-xl bg-muted/10">
                      Nenhuma movimentação registrada para este cliente.
                    </div>
                  ) : (
                    <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-card">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="w-[120px] text-xs font-bold uppercase">Data</TableHead>
                            <TableHead className="text-xs font-bold uppercase">Descrição</TableHead>
                            <TableHead className="text-right text-xs font-bold uppercase w-[120px]">Pontos</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {extratoAtivo.map((item, index) => {
                            const isCredit = item.tipo === "credito"
                            return (
                              <TableRow key={index} className="hover:bg-muted/20 transition-colors">
                                <TableCell className="font-medium text-xs whitespace-nowrap">
                                  {formatarData(item.data)}
                                </TableCell>
                                <TableCell className="text-sm text-foreground">
                                  {item.descricao}
                                </TableCell>
                                <TableCell className={cn(
                                  "text-right font-bold text-sm",
                                  isCredit ? "text-emerald-600" : "text-rose-500"
                                )}>
                                  {isCredit ? `+${item.pontos}` : `-${item.pontos}`}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 h-96">
              <Users className="h-16 w-16 mb-4 text-muted/30 stroke-[1.5]" />
              <p className="text-lg text-foreground font-semibold">Nenhum cliente selecionado</p>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Selecione um cliente na lista ao lado ou digite no campo de pesquisa para visualizar o perfil e extrato completo.
              </p>
            </div>
          )}
        </Card>
      </div>

      <ClienteModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        cliente={clienteAtivo} 
      />
    </div>
  )
}
