"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useConsumerAuth } from "@/features/consumer/contexts/consumer-auth-context"
import { carregarDashboardConsumer, atualizarPerfilConsumer } from "@/features/consumer/consumer.api"
import { api } from "@/lib/api/client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { getPasswordStrength } from "@/lib/masks"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Bell } from "lucide-react"

function extractErrorMessage(err: any): string {
  const apiMessage = err.response?.data?.error?.message || err.response?.data?.message;
  if (typeof apiMessage === 'string' && apiMessage.trim() !== '') return apiMessage;
  if (typeof err.message === 'string' && err.message.trim() !== '') return err.message;
  return "Erro interno do sistema. Tente novamente.";
}

// Schemas
const profileSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  email: z.string().email("E-mail inválido")
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Formato de e-mail inválido")
    .refine(val => !val || !val.endsWith("gmaill.com"), { message: "O domínio do e-mail parece inválido. Você quis dizer gmail.com?" })
    .refine(val => !val || !val.endsWith("hotmai.com"), { message: "O domínio do e-mail parece inválido. Você quis dizer hotmail.com?" })
    .refine(val => !val || !val.endsWith("yahool.com"), { message: "O domínio do e-mail parece inválido. Você quis dizer yahoo.com?" }),
  phone: z.string().optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "A senha atual é obrigatória"),
  newPassword: z.string()
    .min(8, "A senha deve ter no mínimo 8 caracteres.")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula.")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número."),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
})

type ProfileValues = z.infer<typeof profileSchema>
type PasswordValues = z.infer<typeof passwordSchema>

export default function PerfilPage() {
  const { data: authData, updatePassword } = useConsumerAuth()
  const queryClient = useQueryClient()
  const [passwordScore, setPasswordScore] = useState(0)

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["consumer-dashboard"],
    queryFn: carregarDashboardConsumer,
    enabled: !!authData?.profile,
  })

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: {
      name: dashboardData?.profile.name || "",
      email: dashboardData?.profile.email || "",
      phone: dashboardData?.profile.phone || "",
    }
  })

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    mode: "onChange",
  })

  const watchNewPassword = passwordForm.watch("newPassword")
  
  useState(() => {
    // Only used to update score when password changes
    setPasswordScore(getPasswordStrength(watchNewPassword))
  })

  const updateProfileMutation = useMutation({
    mutationFn: atualizarPerfilConsumer,
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!")
      queryClient.invalidateQueries({ queryKey: ["consumer-dashboard"] })
    },
    onError: (err: any) => {
      toast.error(extractErrorMessage(err))
    }
  })

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: Omit<PasswordValues, "confirmPassword">) => {
      if (data.currentPassword === data.newPassword) {
        throw new Error("A nova senha deve ser diferente da senha atual.");
      }

      await api.post<{ success: boolean; message: string }>("/consumer/verify-password", { currentPassword: data.currentPassword })
      
      await updatePassword(data.newPassword)
    },
    onSuccess: () => {
      toast.success("Senha atualizada com sucesso!")
      passwordForm.reset()
    },
    onError: (err: any) => {
      toast.error(extractErrorMessage(err))
    }
  })

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 pt-4 pb-12">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 pt-4 pb-12 px-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas informações pessoais e credenciais de acesso.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados Pessoais</CardTitle>
          <CardDescription>Atualize seu nome, e-mail e telefone de contato.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit((d) => updateProfileMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={dashboardData?.profile.document?.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4") || ""}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-[10px] text-muted-foreground">O CPF não pode ser alterado.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" {...profileForm.register("name")} />
                {profileForm.formState.errors.name && (
                  <p className="text-xs text-destructive">{profileForm.formState.errors.name.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" {...profileForm.register("email")} />
                {profileForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{profileForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" type="tel" placeholder="(00) 00000-0000" {...profileForm.register("phone")} />
                {profileForm.formState.errors.phone && (
                  <p className="text-xs text-destructive">{profileForm.formState.errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={updateProfileMutation.isPending || !profileForm.formState.isDirty}>
                {updateProfileMutation.isPending ? <Spinner className="mr-2" /> : null}
                Salvar Dados
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
          <CardDescription>Altere a sua senha de acesso.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit((d) => updatePasswordMutation.mutate({ currentPassword: d.currentPassword, newPassword: d.newPassword }))} className="space-y-4">
            <div className="space-y-2 md:w-1/2">
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <Input id="currentPassword" type="password" {...passwordForm.register("currentPassword")} />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input id="newPassword" type="password" {...passwordForm.register("newPassword")} />
                
                {watchNewPassword?.length > 0 && (
                  <div className="flex gap-1 mt-1.5 h-1.5 w-full rounded-full overflow-hidden bg-muted">
                    <div className={`h-full transition-all duration-500 ${getPasswordStrength(watchNewPassword) >= 1 ? (getPasswordStrength(watchNewPassword) >= 3 ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-destructive'} w-1/4`} />
                    <div className={`h-full transition-all duration-500 ${getPasswordStrength(watchNewPassword) >= 2 ? (getPasswordStrength(watchNewPassword) >= 3 ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-transparent'} w-1/4`} />
                    <div className={`h-full transition-all duration-500 ${getPasswordStrength(watchNewPassword) >= 3 ? 'bg-emerald-500' : 'bg-transparent'} w-1/4`} />
                    <div className={`h-full transition-all duration-500 ${getPasswordStrength(watchNewPassword) >= 4 ? 'bg-emerald-500' : 'bg-transparent'} w-1/4`} />
                  </div>
                )}

                {passwordForm.formState.errors.newPassword && (
                  <p className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input id="confirmPassword" type="password" {...passwordForm.register("confirmPassword")} />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" variant="secondary" disabled={updatePasswordMutation.isPending || !passwordForm.formState.isDirty}>
                {updatePasswordMutation.isPending ? <Spinner className="mr-2" /> : null}
                Alterar Senha
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              Notificações e Preferências
            </CardTitle>
            <CardDescription>Configure como deseja receber novidades e alertas de seus pontos.</CardDescription>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-none">Em breve</Badge>
        </CardHeader>
        <CardContent className="space-y-4 pt-4 opacity-60 pointer-events-none">
          <div className="flex items-center justify-between rounded-lg border p-3 bg-card shadow-sm">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Alertas de Pontos Expirando</Label>
              <p className="text-xs text-muted-foreground">Receba avisos por e-mail 30 dias antes dos seus pontos expirarem.</p>
            </div>
            <Switch checked disabled />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3 bg-card shadow-sm">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Promoções e Vantagens</Label>
              <p className="text-xs text-muted-foreground">Receba ofertas especiais dos seus restaurantes parceiros.</p>
            </div>
            <Switch checked disabled />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3 bg-card shadow-sm">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Alertas via WhatsApp</Label>
              <p className="text-xs text-muted-foreground">Receba comprovantes de pontuação e resgate diretamente no celular.</p>
            </div>
            <Switch disabled />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
