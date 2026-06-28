"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Save, AlertTriangle } from "lucide-react"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useFidelidadeConfig } from "../../hooks/use-configuracoes"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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

const formSchema = z.object({
  carenciaPontos: z.coerce.number().min(0, "Mínimo 0 dias").max(365, "Máximo 1 ano"),
  expiracaoPontos: z.coerce.number().min(0, "Mínimo 0 dias").max(1825, "Máximo 5 anos"),
  valorConversaoFormatado: z.string().min(4, "Informe um valor válido."),
})

export function ProgramaFidelidadeTab() {
  const { query, mutation } = useFidelidadeConfig()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      carenciaPontos: 0,
      expiracaoPontos: 90,
      valorConversaoFormatado: "R$ 1,00",
    },
  })

  useEffect(() => {
    if (query.data) {
      const rawValue = query.data.pointsConversionReal ?? 1.00;
      const cents = Math.round(rawValue * 100);
      form.reset({
        carenciaPontos: query.data.carenciaPontos ?? 0,
        expiracaoPontos: query.data.expiracaoPontos ?? 90,
        valorConversaoFormatado: applyMoneyMask(cents.toString()),
      })
    }
  }, [query.data, form])

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const unmasked = unmaskMoney(values.valorConversaoFormatado);
    if (unmasked <= 0) {
      form.setError("valorConversaoFormatado", { message: "O valor de conversão deve ser maior que zero." });
      return;
    }
    if (unmasked > 10000) {
      form.setError("valorConversaoFormatado", { message: "Valor de conversão muito alto (máximo R$ 10.000,00)." });
      return;
    }
    
    mutation.mutate({
      carenciaPontos: values.carenciaPontos,
      expiracaoPontos: values.expiracaoPontos,
      pointsConversionReal: unmasked,
    }, {
      onSuccess: () => {
        form.reset(values)
      }
    })
  }

  if (query.isLoading) {
    return <div className="p-12 flex justify-center"><Spinner className="w-8 h-8" /></div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Programa de Fidelidade</CardTitle>
        <CardDescription>
          Regras de ciclo de vida e usabilidade dos pontos acumulados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="default" className="mb-6 bg-primary/5 border-primary/20 text-primary">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção às mudanças</AlertTitle>
          <AlertDescription>
            Alterar essas regras afetará apenas os novos lançamentos. Pontos já gerados manterão as regras vigentes na data em que foram concedidos.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <h3 className="text-lg font-medium">Prazos e Validade</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="carenciaPontos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carência (Dias)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>
                      Número de dias após a compra para o ponto ficar disponível para resgate.
                      Use 0 para disponibilidade imediata.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiracaoPontos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiração (Dias)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>
                      Prazo total de validade dos pontos após a carência antes de sumirem da carteira do cliente.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />
            <h3 className="text-lg font-medium">Regra de Acúmulo</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="valorConversaoFormatado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor gasto para 1 ponto</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="R$ 1,00" 
                        {...field} 
                        onChange={(e) => field.onChange(applyMoneyMask(e.target.value))}
                        className="text-lg font-medium text-emerald-600 dark:text-emerald-400"
                      />
                    </FormControl>
                    <FormDescription>
                      Insira o valor em Reais (R$) necessário para o cliente acumular exatamente 1 ponto.
                      Exemplo: R$ 5,00 gastos = 1 ponto ganho.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={!form.formState.isDirty || mutation.isPending}>
                {mutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Regras
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
