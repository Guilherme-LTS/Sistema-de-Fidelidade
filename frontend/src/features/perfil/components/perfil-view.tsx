"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Save, Lock } from "lucide-react"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { apiRequest } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/auth-context"
import { usePerfil } from "../hooks/use-perfil"

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

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "A senha atual é obrigatória"),
  newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "A confirmação é obrigatória"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
})

export function PerfilView() {
  const { user } = useAuth()
  const { mutation } = usePerfil()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
    },
  })

  useEffect(() => {
    if (user) {
      // O Typescript pode reclamar do phone, mas o auth-context recebe o phone do backend
      form.reset({
        name: user.nome || "",
        phone: (user as any).phone || "",
      })
    }
  }, [user, form])

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    mutation.mutate(values, {
      onSuccess: () => {
        form.reset(values)
      }
    })
  }

  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const onPasswordSubmit = async (values: z.infer<typeof passwordFormSchema>) => {
    try {
      setIsChangingPassword(true)
      await apiRequest("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      })
      toast.success("Senha alterada com sucesso!")
      passwordForm.reset()
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar a senha. Verifique sua senha atual.")
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (!user) {
    return <div className="p-12 flex justify-center"><Spinner className="w-8 h-8" /></div>
  }

  // Traduções das roles
  const roleDisplay = {
    admin: "Administrador",
    operador: "Operador",
    novato: "Novato"
  }[user.role] || user.role

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Dados Pessoais</CardTitle>
          <CardDescription>
            Gerencie suas informações básicas de identificação.
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
                    <Input value={user.email || ""} disabled className="bg-muted" />
                  </FormControl>
                  <FormDescription>Seu e-mail é utilizado para login e não pode ser alterado por aqui.</FormDescription>
                </FormItem>
                <FormItem>
                  <FormLabel>Nível de Acesso</FormLabel>
                  <FormControl>
                    <Input value={roleDisplay} disabled className="bg-muted capitalize" />
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
          <div className="border rounded-lg p-4 bg-muted/5 space-y-4">
            <div>
              <p className="font-medium text-foreground">Alterar Senha de Acesso</p>
              <p className="text-sm text-muted-foreground mt-1">Sua senha deve ter pelo menos 6 caracteres.</p>
            </div>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-sm">
                <FormField control={passwordForm.control} name="currentPassword" render={({field}) => (
                  <FormItem>
                    <FormLabel>Senha Atual</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={passwordForm.control} name="newPassword" render={({field}) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={passwordForm.control} name="confirmPassword" render={({field}) => (
                  <FormItem>
                    <FormLabel>Confirmar Nova Senha</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <div className="pt-2">
                  <Button type="submit" disabled={isChangingPassword} className="w-full sm:w-auto">
                    {isChangingPassword ? <Spinner className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                    Atualizar Senha
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
