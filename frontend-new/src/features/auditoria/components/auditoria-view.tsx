"use client"

import { useState } from "react"
import { useAuditoria } from "../hooks/use-auditoria"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { FileJson, Search, CalendarDays, Activity, User, ChevronLeft, ChevronRight, Hash, Database } from "lucide-react"

const actionTranslations: Record<string, string> = {
  LOGIN: "Login no Sistema",
  LOGOUT: "Logout do Sistema",
  CREATE_CUSTOMER: "Cadastro de Cliente",
  UPDATE_CUSTOMER: "Atualização de Cliente",
  DELETE_CUSTOMER: "Exclusão de Cliente",
  ADD_POINTS: "Lançamento de Pontos",
  REDEEM_REWARD: "Resgate de Recompensa",
  CREATE_REWARD: "Criação de Recompensa",
  UPDATE_REWARD: "Atualização de Recompensa",
  DELETE_REWARD: "Exclusão de Recompensa",
  UPDATE_CONFIG: "Configurações Alteradas",
  UPDATE_USER: "Alteração de Perfil de Usuário",
  DELETE_USER: "Exclusão de Usuário",
  POINTS_EXPIRED: "Pontos Expirados",
  CREATE_USER: "Usuário Criado",
  UPDATE_PASSWORD: "Senha Alterada",
  ACTIVATE_USER: "Usuário Ativado",
  DEACTIVATE_USER: "Usuário Desativado",
}

function getActionLabel(action: string) {
  return actionTranslations[action] || action
}

const entityTranslations: Record<string, string> = {
  TRANSACTION: "Lançamento de Pontos",
  REDEMPTION: "Resgate de Recompensa",
  TENANT_CONFIG: "Perfil do Restaurante",
  LOYALTY_CONFIG: "Regras de Fidelidade",
  USER: "Operador/Usuário",
  CUSTOMER: "Cadastro de Cliente",
  REWARD: "Recompensa",
}

function getEntityLabel(entityType: string | null) {
  if (!entityType) return "-"
  return entityTranslations[entityType] || entityType
}

function formatCPF(cpf: string) {
  if (!cpf) return "-"
  const clean = cpf.replace(/\D/g, "")
  if (clean.length !== 11) return cpf
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

function DetailItem({ label, value, highlight = false, valueClassName = "" }: { label: string, value: React.ReactNode, highlight?: boolean, valueClassName?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className={`font-medium ${highlight ? "text-lg" : "text-sm"} ${valueClassName || "text-foreground"}`}>
        {value}
      </span>
    </div>
  )
}

function renderLogDetailsFriendly(log: any) {
  if (!log.metadata) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-xl border border-dashed border-border/60">
        <Database className="w-8 h-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Sem dados adicionais</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Nenhum metadado foi salvo para este evento.</p>
      </div>
    )
  }
  
  let metadata: any = {}
  try {
    metadata = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata
  } catch (e) {
    return <p className="text-sm text-destructive p-4 bg-destructive/10 rounded-lg border border-destructive/20">Falha ao decodificar os metadados do evento.</p>
  }

  // 1. ADD_POINTS
  if (log.action === "ADD_POINTS") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b pb-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">Dados do Lançamento</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
          <DetailItem label="Cliente" value={metadata.clienteNome || "Não informado"} />
          <DetailItem label="CPF" value={formatCPF(metadata.clienteCpf)} />
          <DetailItem 
            label="Valor da Compra" 
            value={metadata.valorCompra ? `R$ ${Number(metadata.valorCompra).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"} 
            valueClassName="text-emerald-600 dark:text-emerald-400 font-semibold"
          />
          <DetailItem label="Pontos Creditados" value={`+ ${metadata.pontosGanhos} pts`} highlight valueClassName="text-primary font-bold" />
        </div>
      </div>
    )
  }

  // 2. POINTS_EXPIRED
  if (log.action === "POINTS_EXPIRED") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b pb-3">
          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">Dados da Expiração</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
          <DetailItem label="Cliente" value={metadata.clienteNome || "Não informado"} />
          <DetailItem label="CPF" value={formatCPF(metadata.clienteCpf)} />
          <DetailItem 
            label="Quantidade Expirada" 
            value={`- ${metadata.pontosExpirados || metadata.pointsExpired || 0} pts`} 
            highlight 
            valueClassName="text-orange-600 dark:text-orange-500 font-bold" 
          />
          <DetailItem 
            label="Motivo" 
            value={metadata.motivo || "Expiração automática conforme regras do programa de fidelidade."} 
            valueClassName="text-muted-foreground text-sm"
          />
        </div>
      </div>
    )
  }

  // 3. REDEEM_REWARD
  if (log.action === "REDEEM_REWARD") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b pb-3">
          <div className="w-2 h-2 rounded-full bg-rose-500"></div>
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">Dados do Resgate</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
          <DetailItem label="Cliente" value={metadata.clienteNome || "Não informado"} />
          <DetailItem label="CPF" value={formatCPF(metadata.clienteCpf)} />
          <DetailItem label="Recompensa" value={metadata.recompensaNome || "-"} />
          <DetailItem 
            label="Pontos Gastos" 
            value={`- ${metadata.pontosGastos} pts`} 
            highlight 
            valueClassName="text-rose-600 dark:text-rose-500 font-bold" 
          />
        </div>
      </div>
    )
  }

  // 4. CREATE_CUSTOMER
  if (log.action === "CREATE_CUSTOMER") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b pb-3">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">Dados do Cadastro</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
          <DetailItem label="Cliente" value={metadata.clienteNome || "Não informado"} />
          <DetailItem label="CPF" value={formatCPF(metadata.clienteCpf)} />
          <DetailItem label="ID no Sistema" value={metadata.clienteId || "-"} />
        </div>
      </div>
    )
  }

  // 5. UPDATE_CONFIG
  if (log.action === "UPDATE_CONFIG") {
    const isFidelidade = metadata.action === "UPDATE_FIDELIDADE"
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b pb-3">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            {isFidelidade ? "Regras do Programa de Fidelidade" : "Configurações do Restaurante"}
          </h4>
        </div>
        <div className="space-y-4">
          {isFidelidade ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
              <DetailItem label="Carência de Pontos" value={`${metadata.changes?.carenciaPontos} dias`} />
              <DetailItem label="Expiração de Pontos" value={`${metadata.changes?.expiracaoPontos} dias`} />
            </div>
          ) : (
            <div className="space-y-3">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Campos Alterados</span>
              <div className="bg-muted/30 rounded-lg border max-h-[250px] overflow-y-auto divide-y divide-border">
                {metadata.changes && Object.entries(metadata.changes).map(([key, val]: any) => {
                  if (val === undefined || val === null || val === "") return null
                  const labelMap: Record<string, string> = {
                    name: "Nome Comercial",
                    tradingName: "Nome de Fantasia",
                    phone: "Telefone",
                    email: "E-mail",
                    addressLine1: "Endereço",
                    addressNumber: "Número",
                    addressCity: "Cidade",
                    addressState: "Estado",
                    latitude: "Latitude",
                    longitude: "Longitude",
                    logoUrl: "URL do Logo"
                  }
                  const label = labelMap[key] || key
                  return (
                    <div key={key} className="flex justify-between items-center py-2.5 px-4 hover:bg-muted/50 transition-colors">
                      <span className="text-sm font-medium text-muted-foreground">{label}</span>
                      <span className="text-sm text-foreground font-medium text-right truncate max-w-[60%]">{String(val)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 4. UPDATE_USER
  if (log.action === "UPDATE_USER") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b pb-3">
          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">Perfil do Operador Atualizado</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
          {metadata.changes?.name && (
            <DetailItem label="Nome" value={metadata.changes.name} />
          )}
          {metadata.changes?.phone && (
            <DetailItem label="Telefone" value={metadata.changes.phone} />
          )}
        </div>
      </div>
    )
  }

  // Fallback genérico para outros eventos
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b pb-3">
        <Hash className="w-4 h-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">Dados da Ação</h4>
      </div>
      <div className="bg-muted/30 rounded-lg border max-h-[300px] overflow-y-auto divide-y divide-border">
        {Object.entries(metadata).map(([key, val]: any) => {
          if (typeof val === "object" && val !== null) {
            return (
              <div key={key} className="flex flex-col gap-2 py-3 px-4 hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium text-muted-foreground">{key}</span>
                <pre className="bg-background/80 p-3 rounded-md border shadow-sm font-mono text-[11px] overflow-x-auto text-foreground">
                  {JSON.stringify(val, null, 2)}
                </pre>
              </div>
            )
          }
          return (
            <div key={key} className="flex justify-between items-center py-3 px-4 hover:bg-muted/50 transition-colors">
              <span className="text-sm font-medium text-muted-foreground">{key}</span>
              <span className="text-sm text-foreground font-medium text-right truncate max-w-[60%]">{String(val)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AuditoriaView() {
  const [page, setPage] = useState(1)
  const [q, setQ] = useState("")
  const [action, setAction] = useState("ALL")
  const [status, setStatus] = useState("ALL")
  const [selectedLog, setSelectedLog] = useState<any | null>(null)

  const { data, isLoading } = useAuditoria({
    page,
    limit: 15,
    q,
    action,
    status
  })

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Auditoria</h2>
        <p className="text-muted-foreground text-sm">
          Histórico completo de atividades, transações e alterações de segurança no sistema.
        </p>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Busca</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar por cliente, CPF, email ou detalhes..." 
                  className="pl-9 h-10 bg-muted/20"
                  value={q} 
                  onChange={(e) => setQ(e.target.value)} 
                />
              </div>
            </div>
            
            <div className="w-full sm:w-[240px] space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo de Ação</label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="h-10 bg-muted/20 cursor-pointer">
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem className="cursor-pointer" value="ALL">Todas as Ações</SelectItem>
                  <SelectItem className="cursor-pointer" value="LOGIN">Login</SelectItem>
                  <SelectItem className="cursor-pointer" value="UPDATE_CONFIG">Alterar Configuração</SelectItem>
                  <SelectItem className="cursor-pointer" value="CREATE_CUSTOMER">Cadastro de Cliente</SelectItem>
                  <SelectItem className="cursor-pointer" value="ADD_POINTS">Lançar Pontos</SelectItem>
                  <SelectItem className="cursor-pointer" value="REDEEM_REWARD">Resgatar Recompensa</SelectItem>
                  <SelectItem className="cursor-pointer" value="POINTS_EXPIRED">Pontos Expirados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-[180px] space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-10 bg-muted/20 cursor-pointer">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem className="cursor-pointer" value="ALL">Todos os status</SelectItem>
                  <SelectItem className="cursor-pointer" value="SUCESSO">Sucesso</SelectItem>
                  <SelectItem className="cursor-pointer" value="FALHA">Falha</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-12 text-xs font-semibold uppercase tracking-wider text-muted-foreground pl-6">Data da Ação</TableHead>
                <TableHead className="h-12 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Operador</TableHead>
                <TableHead className="h-12 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ação</TableHead>
                <TableHead className="h-12 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Área Afetada</TableHead>
                <TableHead className="h-12 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="h-12 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right pr-6">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="h-[400px] text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Spinner className="w-8 h-8 mb-4 text-primary" />
                      <p className="text-sm font-medium">Carregando registros de auditoria...</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && data?.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-[400px] text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Search className="w-10 h-10 mb-4 opacity-20" />
                      <p className="text-base font-medium text-foreground">Nenhum registro encontrado</p>
                      <p className="text-sm mt-1">Tente ajustar os filtros de busca para ver mais resultados.</p>
                      {(q !== "" || action !== "ALL" || status !== "ALL") && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-6"
                          onClick={() => { setQ(""); setAction("ALL"); setStatus("ALL") }}
                        >
                          Limpar Filtros
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && data?.data.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/30 transition-colors group">
                  <TableCell className="py-4 pl-6">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{format(new Date(log.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(log.created_at), "HH:mm:ss", { locale: ptBR })}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="font-medium text-sm truncate max-w-[150px]">
                        {log.operator?.name || "Sistema"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="secondary" className="font-medium bg-muted text-foreground/80 hover:bg-muted/80">
                      {getActionLabel(log.action)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="text-sm text-muted-foreground font-medium">{getEntityLabel(log.entity_type)}</span>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge 
                      variant={log.status === "SUCESSO" ? "default" : "destructive"}
                      className={log.status === "SUCESSO" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/20" : ""}
                    >
                      {log.status === "SUCESSO" ? "Sucesso" : "Falha"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4 text-right pr-6">
                    {log.metadata && log.metadata !== "{}" && log.metadata !== "null" ? (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 opacity-60 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary"
                        onClick={() => setSelectedLog(log)}
                      >
                        <FileJson className="w-4 h-4" />
                        <span className="sr-only">Ver Detalhes</span>
                      </Button>
                    ) : (
                      <span className="text-muted-foreground/30 text-sm font-medium mr-3">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {!isLoading && data && data.metadata.totalPages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-border bg-muted/10">
              <span className="text-sm text-muted-foreground font-medium">
                Página <span className="text-foreground">{data.metadata.page}</span> de <span className="text-foreground">{data.metadata.totalPages}</span>
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-3"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Anterior
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-3"
                  disabled={page === data.metadata.totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Próxima
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden border-border/60 shadow-lg sm:rounded-xl">
          <DialogHeader className="px-6 py-5 border-b bg-muted/20">
            <DialogTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-primary" />
              </div>
              Detalhes do Evento
            </DialogTitle>
            <DialogDescription className="pl-10">
              Resumo detalhado da ação registrada na trilha de auditoria.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="flex flex-col max-h-[75vh] overflow-y-auto">
              {/* Informações Gerais do Log */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 p-6 border-b border-border/50 bg-background">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ação Executada</span>
                  <span className="font-semibold text-foreground">{getActionLabel(selectedLog.action)}</span>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
                  <div>
                    <Badge 
                      variant={selectedLog.status === "SUCESSO" ? "default" : "destructive"}
                      className={selectedLog.status === "SUCESSO" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 border-none shadow-none" : "border-none shadow-none"}
                    >
                      {selectedLog.status === "SUCESSO" ? "Sucesso" : "Falha"}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Data e Hora</span>
                  <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                    {format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Operador</span>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="font-medium text-sm text-foreground block">{selectedLog.operator?.name || "Sistema"}</span>
                      {selectedLog.operator?.email && (
                        <span className="text-xs text-muted-foreground block">{selectedLog.operator.email}</span>
                      )}
                    </div>
                  </div>
                </div>

                {selectedLog.ip_address && (
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Endereço IP</span>
                    <span className="font-mono text-xs text-muted-foreground bg-muted/50 w-max px-2 py-1 rounded-md border">{selectedLog.ip_address}</span>
                  </div>
                )}
              </div>

              {/* Informações de Negócio amigáveis */}
              <div className="p-6">
                <div className="bg-card rounded-xl border border-border shadow-sm">
                  <div className="p-5 sm:p-6">
                    {renderLogDetailsFriendly(selectedLog)}
                  </div>
                </div>
              </div>

              {/* Detalhes Técnicos Recolhíveis */}
              {selectedLog.metadata && (
                <div className="px-6 pb-6">
                  <details className="group border rounded-xl bg-muted/10 overflow-hidden transition-all duration-200">
                    <summary className="cursor-pointer p-4 text-sm font-semibold text-muted-foreground select-none flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <FileJson className="w-4 h-4" />
                        <span>Dados Técnicos (JSON Bruto)</span>
                      </div>
                      <span className="text-xs font-medium bg-background px-2 py-1 rounded border text-muted-foreground group-open:hidden">Mostrar</span>
                      <span className="text-xs font-medium bg-background px-2 py-1 rounded border text-muted-foreground hidden group-open:block">Ocultar</span>
                    </summary>
                    <div className="p-4 border-t border-border/50 bg-background/50">
                      <pre className="text-[11px] font-mono overflow-x-auto text-foreground whitespace-pre-wrap p-2 bg-muted/30 rounded-lg border">
                        {JSON.stringify(JSON.parse(selectedLog.metadata), null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
