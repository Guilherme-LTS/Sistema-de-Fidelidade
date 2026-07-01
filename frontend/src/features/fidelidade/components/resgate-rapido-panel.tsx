"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Gift, Search, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Spinner } from "@/components/ui/spinner"
import { applyCpfMask, isValidCpf } from "@/lib/validators/cpf"
import { useClienteComExtrato } from "@/features/clientes/hooks/use-clientes"
import { ResgateModal } from "@/features/resgates/components/resgate-modal"

const resgateSearchSchema = z.object({
  document: z.string().refine((val) => isValidCpf(val), "CPF inválido"),
})

export function ResgateRapidoPanel() {
  const [searchedCpf, setSearchedCpf] = useState<string | null>(null)

  const form = useForm<z.infer<typeof resgateSearchSchema>>({
    resolver: zodResolver(resgateSearchSchema),
    defaultValues: { document: "" },
  })

  const { data, isLoading, isError } = useClienteComExtrato(searchedCpf)
  const cliente = data?.cliente

  const onSubmit = (data: z.infer<typeof resgateSearchSchema>) => {
    setSearchedCpf(data.document)
  }

  return (
    <Card className="p-0 border-border shadow-sm bg-card overflow-hidden w-full h-full flex flex-col">
      <CardHeader className="bg-primary/5 border-b border-border min-h-[120px] pt-6 pb-6 px-6">
        <CardTitle className="text-xl flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Resgate Rápido
        </CardTitle>
        <CardDescription>
          Busque o cliente para visualizar o saldo e realizar resgates na hora.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 flex-1 flex flex-col">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2 mb-6">
            <FormField
              control={form.control}
              name="document"
              render={({ field }) => (
                <FormItem className="flex-1 space-y-0">
                  <FormControl>
                    <Input 
                      placeholder="CPF do Cliente" 
                      {...field} 
                      onChange={(e) => field.onChange(applyCpfMask(e.target.value))}
                      maxLength={14}
                    />
                  </FormControl>
                  <FormMessage className="mt-1 text-xs" />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Spinner className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </Button>
          </form>
        </Form>

        <div className="flex-1 flex flex-col justify-center border rounded-xl p-6 bg-muted/10 relative min-h-[200px]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner className="h-6 w-6 text-primary" />
            </div>
          )}

          {!searchedCpf && !isLoading && (
            <div className="text-center text-muted-foreground animate-fade-in">
              <User className="mx-auto h-12 w-12 opacity-20 mb-2" />
              <p>Informe o CPF para buscar o saldo.</p>
            </div>
          )}

          {searchedCpf && !isLoading && isError && (
            <div className="text-center text-destructive animate-fade-in">
              <p>Cliente não encontrado.</p>
            </div>
          )}

          {searchedCpf && !isLoading && cliente && (
            <div className="animate-fade-in flex flex-col items-center text-center">
              <div className="h-14 w-14 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl mb-4">
                {(cliente.nome || "C")[0].toUpperCase()}
              </div>
              <h3 className="text-xl font-bold">{cliente.nome || "Cliente sem nome"}</h3>
              <p className="text-sm text-muted-foreground mb-6">CPF: {cliente.document}</p>
              
              <div className="bg-card border shadow-sm rounded-lg w-full p-4 mb-6 flex justify-between items-center">
                <span className="text-muted-foreground text-sm font-medium">Saldo Disponível</span>
                <span className="text-2xl font-bold text-emerald-600">{cliente.pontosDisponiveis ?? 0} pts</span>
              </div>

              <ResgateModal 
                document={cliente.document} 
                pontosDisponiveis={cliente.pontosDisponiveis ?? 0} 
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
