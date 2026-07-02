"use client"

import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useLancarPontos } from "../hooks/use-transacoes"
import { limparCpf, buscarClientePorCpf, Cliente } from "@/features/clientes/clientes.api"
import { isValidCpf, applyCpfMask } from "@/lib/validators/cpf"
import { useFidelidadeConfig } from "@/features/configuracoes/hooks/use-configuracoes"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Coins, User, CheckCircle2, Search } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

const applyMoneyMask = (value: string) => {
  let v = value.replace(/\D/g, "")
  if (!v) return ""
  v = (parseInt(v, 10) / 100).toFixed(2)
  return `R$ ${v.replace(".", ",")}`
}

const unmaskMoney = (value: string) => {
  if (!value) return 0
  const clean = value.replace(/\D/g, "")
  return parseInt(clean, 10) / 100
}


const finalFormSchema = z.object({
  document: z.string().refine((val) => isValidCpf(val), {
    message: "CPF inválido.",
  }),
  valorFormatado: z.string().min(4, "Informe um valor válido."),
  lgpdConsentimento: z.boolean().optional(),
  isNewCustomer: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.isNewCustomer) {
    if (data.lgpdConsentimento !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "É necessário o consentimento para prosseguir.",
        path: ["lgpdConsentimento"],
      });
    }
  }
});

export function LancamentoPontosForm() {
  const [successData, setSuccessData] = useState<{ pontos: number; cliente: string } | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [foundCustomer, setFoundCustomer] = useState<Cliente | null>(null)
  
  const lancarMutation = useLancarPontos()
  const { query: fidelidadeConfig } = useFidelidadeConfig()

  const form = useForm<z.infer<typeof finalFormSchema>>({
    resolver: zodResolver(finalFormSchema),
    defaultValues: {
      document: "",
      valorFormatado: "",
      lgpdConsentimento: false,
      isNewCustomer: false,
    },
  })

  const documentValue = form.watch("document")
  const isCpfValid = isValidCpf(documentValue || "")
  
  useEffect(() => {
    const checkCpf = async () => {
      const clean = limparCpf(documentValue || "")
      if (isValidCpf(clean)) {
        setIsSearching(true)
        const cliente = await buscarClientePorCpf(clean)
        setIsSearching(false)
        if (cliente) {
          setFoundCustomer(cliente)
          form.setValue("isNewCustomer", false)
          form.clearErrors(["lgpdConsentimento"])
        } else {
          setFoundCustomer(null)
          form.setValue("isNewCustomer", true)
        }
      } else {
        setFoundCustomer(null)
        form.setValue("isNewCustomer", false)
      }
    }

    const timeout = setTimeout(checkCpf, 300)
    return () => clearTimeout(timeout)
  }, [documentValue, form])

  const onSubmit = async (values: z.infer<typeof finalFormSchema>) => {
    const valorReal = unmaskMoney(values.valorFormatado)
    if (valorReal <= 0) {
      form.setError("valorFormatado", { message: "Valor deve ser maior que zero." })
      return
    }

    const input = {
      document: limparCpf(values.document),
      valor: valorReal,
      lgpdConsentimento: values.isNewCustomer ? values.lgpdConsentimento : undefined,
    }

    lancarMutation.mutate(input, {
      onSuccess: (data) => {
        setSuccessData({
          pontos: data.pontosGanhos,
          cliente: data.cliente.nome || data.cliente.document,
        })
        form.reset()
        setFoundCustomer(null)
      }
    })
  }

  const handleReset = () => {
    setSuccessData(null)
  }

  return (
    <Card className="p-0 border-border shadow-sm bg-card overflow-hidden w-full h-full flex flex-col transition-all duration-300">
      <CardHeader className="bg-primary/5 border-b border-border min-h-[120px] pt-6 pb-6 px-6">
        <CardTitle className="text-xl flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          Lançamento de Pontos
        </CardTitle>
        <CardDescription>
          Digite o CPF para iniciar o lançamento. Se o cliente for novo, o cadastro é feito na hora.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 flex-1 flex flex-col">
        {successData ? (
          <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">+{successData.pontos} Pontos</h3>
            <p className="text-muted-foreground max-w-md">
              Os pontos foram creditados com sucesso na conta de <strong className="text-foreground">{successData.cliente}</strong>.
            </p>
            <Button onClick={handleReset} className="mt-6" variant="outline">
              Fazer novo lançamento
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF do Cliente</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder="000.000.000-00" 
                            {...field} 
                            onChange={(e) => field.onChange(applyCpfMask(e.target.value))}
                            maxLength={14}
                            className="pr-10 text-lg font-medium"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {isSearching ? (
                              <Spinner className="h-4 w-4" />
                            ) : (
                              <Search className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isCpfValid && !isSearching && foundCustomer && (
                  <div className="bg-primary/10 p-4 rounded-md flex items-center gap-3 animate-fade-in">
                    <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold">
                      {(foundCustomer.nome || "C")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{foundCustomer.nome || "Cliente cadastrado"}</p>
                      <p className="text-sm text-muted-foreground">
                        {foundCustomer.isGlobalOnly
                          ? (foundCustomer.hasActiveAccount 
                              ? "Conta ativa na plataforma (vínculo ao estabelecimento ao lançar)" 
                              : "Pré-cadastro na plataforma (vínculo estabelecimento ao lançar)")
                          : "Cliente já cadastrado neste restaurante"}
                      </p>
                    </div>
                  </div>
                )}

                {isCpfValid && !isSearching && !foundCustomer && (
                  <div className="space-y-4 pt-4 border-t border-border animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Cliente Novo - Autorização Necessária
                    </p>
                    <FormField
                      control={form.control}
                      name="lgpdConsentimento"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Consentimento de Uso de Dados (LGPD)
                            </FormLabel>
                            <FormDescription>
                              O cliente autoriza o armazenamento do CPF e nome para participação no programa de fidelidade.
                            </FormDescription>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {isCpfValid && !isSearching && (
                <div className="pt-4 border-t border-border animate-fade-in">
                  <FormField
                    control={form.control}
                    name="valorFormatado"
                    render={({ field }) => {
                      const conversionRule = fidelidadeConfig.data?.pointsConversionReal ?? 1.00;
                      return (
                        <FormItem>
                          <FormLabel>Valor da Compra</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="R$ 0,00" 
                              {...field} 
                              onChange={(e) => field.onChange(applyMoneyMask(e.target.value))}
                              className="text-lg font-medium text-emerald-600 dark:text-emerald-400"
                            />
                          </FormControl>
                          <FormDescription>
                            Cada R$ {conversionRule.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em compras equivale a 1 ponto.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <Button type="submit" className="w-full h-12 text-md mt-6" disabled={lancarMutation.isPending}>
                    {lancarMutation.isPending ? (
                      <>
                        <Spinner className="mr-2 h-5 w-5" />
                        Processando...
                      </>
                    ) : (
                      "Lançar Pontos Agora"
                    )}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  )
}
