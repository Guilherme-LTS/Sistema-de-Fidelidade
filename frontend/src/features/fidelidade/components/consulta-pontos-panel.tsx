"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Search, UserSearch, AlertCircle, ArrowUpRight, ArrowDownRight, RefreshCcw } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Spinner } from "@/components/ui/spinner"
import { applyCpfMask, isValidCpf } from "@/lib/validators/cpf"
import { useClienteComExtrato } from "@/features/clientes/hooks/use-clientes"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const consultaSearchSchema = z.object({
  document: z.string().refine((val) => isValidCpf(val), "CPF inválido"),
})

export function ConsultaPontosPanel() {
  const [searchedCpf, setSearchedCpf] = useState<string | null>(null)

  const form = useForm<z.infer<typeof consultaSearchSchema>>({
    resolver: zodResolver(consultaSearchSchema),
    defaultValues: { document: "" },
  })

  const { data, isLoading, isError, refetch } = useClienteComExtrato(searchedCpf)
  const cliente = data?.cliente
  const extrato = data?.extrato || []

  const onSubmit = (formData: z.infer<typeof consultaSearchSchema>) => {
    setSearchedCpf(formData.document)
  }

  return (
    <Card className="border-border shadow-sm bg-card w-full">
      <CardHeader className="bg-primary/5 border-b border-border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <UserSearch className="h-5 w-5 text-primary" />
              Consulta de Pontos e Extrato
            </CardTitle>
            <CardDescription>
              Visualize o saldo atual, histórico de transações e expirações pendentes.
            </CardDescription>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2 w-full sm:w-auto">
              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem className="flex-1 sm:w-64 space-y-0">
                    <FormControl>
                      <Input 
                        placeholder="Buscar por CPF" 
                        {...field} 
                        onChange={(e) => field.onChange(applyCpfMask(e.target.value))}
                        maxLength={14}
                        className="bg-background"
                      />
                    </FormControl>
                    <FormMessage className="absolute mt-1 text-xs" />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="shrink-0">
                {isLoading ? <Spinner className="h-4 w-4 mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Consultar
              </Button>
            </form>
          </Form>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {!searchedCpf && (
          <div className="p-12 text-center text-muted-foreground animate-fade-in">
            <UserSearch className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">Busque um cliente</h3>
            <p>Informe o CPF acima para visualizar o extrato completo.</p>
          </div>
        )}

        {searchedCpf && isError && (
          <div className="p-12 text-center text-destructive animate-fade-in flex flex-col items-center">
            <AlertCircle className="h-12 w-12 opacity-50 mb-4" />
            <h3 className="text-lg font-medium mb-1">Cliente não encontrado</h3>
            <p className="text-sm opacity-80 mb-4">Verifique se o CPF foi digitado corretamente ou se o cliente possui cadastro.</p>
            <Button variant="outline" onClick={() => {
              setSearchedCpf(null)
              form.reset()
            }}>
              Limpar busca
            </Button>
          </div>
        )}

        {searchedCpf && cliente && (
          <div className="animate-fade-in">
            <div className="p-6 border-b border-border bg-muted/10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-2xl border border-primary/20 shadow-sm">
                    {(cliente.nome || "C")[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{cliente.nome || "Cliente sem nome"}</h3>
                    <p className="text-muted-foreground font-medium">CPF: <span className="text-foreground">{cliente.document}</span></p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
                  <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="shadow-none border-primary/20 bg-primary/5">
                  <CardContent className="p-4 flex flex-col">
                    <span className="text-sm font-medium text-muted-foreground mb-1">Saldo Disponível</span>
                    <span className="text-3xl font-bold text-emerald-600">{cliente.pontosDisponiveis ?? 0}</span>
                  </CardContent>
                </Card>
                <Card className="shadow-none bg-background">
                  <CardContent className="p-4 flex flex-col">
                    <span className="text-sm font-medium text-muted-foreground mb-1">Pontos Pendentes</span>
                    <span className="text-2xl font-bold">{cliente.pontosPendentes ?? 0}</span>
                  </CardContent>
                </Card>
                <Card className="shadow-none bg-background">
                  <CardContent className="p-4 flex flex-col">
                    <span className="text-sm font-medium text-muted-foreground mb-1">Expiração Próxima</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-amber-500">{cliente.pontosExpirando ?? 0}</span>
                      {cliente.dataProximaExpiracao && (
                        <span className="text-xs text-muted-foreground">
                          em {format(new Date(cliente.dataProximaExpiracao), "dd/MM/yyyy")}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="p-6">
              <h4 className="font-semibold text-lg mb-4">Últimas Movimentações</h4>
              
              {extrato.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/5">
                  Nenhuma movimentação registrada para este cliente.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[180px]">Data e Hora</TableHead>
                        <TableHead>Operação</TableHead>
                        <TableHead className="text-right">Pontos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {extrato.slice(0, 10).map((mov, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium text-muted-foreground">
                            {format(new Date(mov.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {mov.tipo === "credito" ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
                                  <ArrowUpRight className="mr-1 h-3 w-3" /> Crédito
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200">
                                  <ArrowDownRight className="mr-1 h-3 w-3" /> Débito
                                </Badge>
                              )}
                              <span className="text-sm">{mov.descricao}</span>
                            </div>
                          </TableCell>
                          <TableCell className={`text-right font-bold ${mov.tipo === "credito" ? "text-emerald-600" : "text-rose-600"}`}>
                            {mov.tipo === "credito" ? "+" : "-"}{mov.pontos}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {extrato.length > 10 && (
                    <div className="text-center py-3 bg-muted/20 border-t text-sm text-muted-foreground">
                      Mostrando as 10 movimentações mais recentes.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
