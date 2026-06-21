"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Save, Lock } from "lucide-react"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useUsuario } from "../../hooks/use-configuracoes"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { apiRequest } from "@/lib/api/client"

const formatPhone = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .slice(0, 15)
}

const formSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  phone: z.string().optional(),
})

export function PerfilUsuarioTab() {
  const { query, mutation } = useUsuario()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
    },
  })

  useEffect(() => {
    if (query.data) {
      form.reset({
        name: query.data.name || "",
        phone: query.data.phone || "",
      })
    }
  }, [query.data, form])

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    mutation.mutate(values, {
      onSuccess: () => {
        form.reset(values)
      }
    })
  }

  const handlePasswordReset = async () => {
    try {
      // In a real app we would call a backend route that issues a Supabase reset password email
      // Or we can just show a toast for now.
      toast.info("Em um ambiente real, enviaremos um link de recuperação para o e-mail cadastrado.")
    } catch {
      toast.error("Erro ao solicitar redefinição de senha.")
    }
  }

  if (query.isLoading) {
    return <div className="p-12 flex justify-center"><Spinner className="w-8 h-8" /></div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Meu Perfil</CardTitle>
          <CardDescription>
            Informações da sua conta de operador/administrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu nome" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(00) 00000-0000" 
                          {...field} 
                          onChange={(e) => field.onChange(formatPhone(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>E-mail de Login</FormLabel>
                  <FormControl>
                    <Input value={query.data?.email || "email@exemplo.com"} disabled className="bg-muted" />
                  </FormControl>
                  <FormDescription>Seu e-mail não pode ser alterado por aqui.</FormDescription>
                </FormItem>
                <FormItem>
                  <FormLabel>Nível de Acesso</FormLabel>
                  <FormControl>
                    <Input value={query.data?.role === "admin" ? "Administrador" : "Operador"} disabled className="bg-muted capitalize" />
                  </FormControl>
                </FormItem>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={!form.formState.isDirty || mutation.isPending}>
                  {mutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" /> Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border rounded-lg p-4 bg-muted/5">
            <div>
              <p className="font-medium text-foreground">Senha de Acesso</p>
              <p className="text-sm text-muted-foreground mt-1">Sua senha é utilizada para fazer login no sistema.</p>
            </div>
            <Button variant="outline" className="mt-4 sm:mt-0" onClick={handlePasswordReset}>
              Alterar Senha
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
