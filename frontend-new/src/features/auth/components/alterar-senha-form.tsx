"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { KeyRound, Lock } from "lucide-react"

import { getPasswordStrength } from "@/lib/masks"
import { useAuth } from "@/lib/auth/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { routes } from "@/config/routes"

const passwordSchema = z.object({
  password: z.string()
    .min(8, { message: "A senha deve ter no mínimo 8 caracteres." })
    .regex(/[A-Z]/, { message: "A senha deve conter pelo menos uma letra maiúscula." })
    .regex(/[0-9]/, { message: "A senha deve conter pelo menos um número." }),
  confirmPassword: z.string().min(6, { message: "A confirmação de senha é obrigatória." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
})

type PasswordFormValues = z.infer<typeof passwordSchema>

export function AlterarSenhaForm() {
  const [carregando, setCarregando] = useState(false)
  const [passwordScore, setPasswordScore] = useState(0)
  const { updatePassword, user } = useAuth()
  const router = useRouter()

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange",
  })

  // Watch password to update strength indicator
  const watchPassword = form.watch("password")
  
  useEffect(() => {
    setPasswordScore(getPasswordStrength(watchPassword))
  }, [watchPassword])

  useEffect(() => {
    // Prefetch rotas para acelerar o redirecionamento pós-sucesso
    router.prefetch(routes.admin.dashboard)
    router.prefetch(routes.admin.fidelidade)
  }, [router])

  const onSubmit = async (values: PasswordFormValues) => {
    setCarregando(true)
    try {
      await updatePassword(values.password)
      toast.success("Senha atualizada com sucesso!")
      
      // Se o usuário estiver totalmente carregado e tiver uma role
      if (user?.role === "novato") {
        router.push(routes.admin.fidelidade)
      } else {
        router.push(routes.admin.dashboard)
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar a senha.")
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Card className="w-full max-w-md shadow-2xl border-border bg-card/65 backdrop-blur-md rounded-2xl relative overflow-hidden transition-all duration-300">
      <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary via-emerald-500 to-teal-500" />
      
      <CardHeader className="space-y-2 text-center pt-8">
        <div className="flex justify-center mb-2 animate-bounce">
          <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          Definir Nova Senha
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs px-4">
          Crie uma nova senha segura para acessar sua conta.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-semibold text-foreground/80">
              Nova Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="pl-10 h-10 border-border focus:shadow-md transition-all duration-200"
                {...form.register("password")}
              />
            </div>

            {/* Força da Senha */}
            {watchPassword.length > 0 && (
              <div className="flex gap-1 mt-1.5 h-1.5 w-full rounded-full overflow-hidden bg-muted">
                <div className={`h-full transition-all duration-500 ${passwordScore >= 1 ? (passwordScore >= 3 ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-destructive'} w-1/4`} />
                <div className={`h-full transition-all duration-500 ${passwordScore >= 2 ? (passwordScore >= 3 ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-transparent'} w-1/4`} />
                <div className={`h-full transition-all duration-500 ${passwordScore >= 3 ? 'bg-emerald-500' : 'bg-transparent'} w-1/4`} />
                <div className={`h-full transition-all duration-500 ${passwordScore >= 4 ? 'bg-emerald-500' : 'bg-transparent'} w-1/4`} />
              </div>
            )}
            {form.formState.errors.password && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground/80">
              Confirmar Nova Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                className="pl-10 h-10 border-border focus:shadow-md transition-all duration-200"
                {...form.register("confirmPassword")}
              />
            </div>
            {form.formState.errors.confirmPassword && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-10 font-medium bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:scale-[1.01] transition-all duration-200"
            disabled={carregando}
          >
            {carregando ? (
              <>
                <Spinner className="mr-2 h-4 w-4" /> Salvando...
              </>
            ) : (
              "Salvar e Entrar"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
