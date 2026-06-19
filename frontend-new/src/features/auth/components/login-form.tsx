"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LogIn, ArrowLeft, Mail, Lock } from "lucide-react"

import { useAuth } from "@/lib/auth/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { routes } from "@/config/routes"

const loginSchema = z.object({
  email: z.string().email({ message: "E-mail inválido." }),
  password: z.string().min(6, { message: "A senha deve ter no mínimo 6 caracteres." }),
})

const forgotSchema = z.object({
  email: z.string().email({ message: "E-mail inválido." }),
})

type LoginFormValues = z.infer<typeof loginSchema>
type ForgotFormValues = z.infer<typeof forgotSchema>

export function LoginForm() {
  const [forgotMode, setForgotMode] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const { login, sendPasswordReset } = useAuth()
  const router = useRouter()

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const forgotForm = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  })

  const handleLoginSubmit = async (values: LoginFormValues) => {
    setCarregando(true)
    try {
      await login(values.email, values.password)
      toast.success("Login realizado com sucesso!")
      router.push(routes.admin.dashboard)
    } catch (err: any) {
      toast.error(err.message || "Erro ao realizar login.")
    } finally {
      setCarregando(false)
    }
  }

  const handleForgotSubmit = async (values: ForgotFormValues) => {
    setCarregando(true)
    try {
      await sendPasswordReset(values.email)
      toast.success("Enviamos um link para redefinir sua senha!")
      setForgotMode(false)
    } catch (err: any) {
      toast.error(err.message || "Erro ao solicitar recuperação de senha.")
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
            <LogIn className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          {forgotMode ? "Recuperar Senha" : "Acesso ao Sistema"}
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs px-4">
          {forgotMode
            ? "Insira seu e-mail cadastrado para receber as instruções de recuperação"
            : "Insira suas credenciais administrativas para gerenciar o programa de fidelidade"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {forgotMode ? (
          <form onSubmit={forgotForm.handleSubmit(handleForgotSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-foreground/80">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@fidelidade.com"
                  className="pl-10 h-10 border-border focus:shadow-md transition-all duration-200"
                  {...forgotForm.register("email")}
                />
              </div>
              {forgotForm.formState.errors.email && (
                <p className="text-xs text-destructive mt-1">
                  {forgotForm.formState.errors.email.message}
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
                  <Spinner className="mr-2 h-4 w-4" /> Enviando...
                </>
              ) : (
                "Enviar link de recuperação"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-foreground/80">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@fidelidade.com"
                  className="pl-10 h-10 border-border focus:shadow-md transition-all duration-200"
                  {...loginForm.register("email")}
                />
              </div>
              {loginForm.formState.errors.email && (
                <p className="text-xs text-destructive mt-1">
                  {loginForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold text-foreground/80 flex justify-between items-center">
                <span>Senha</span>
                <button
                  type="button"
                  onClick={() => setForgotMode(true)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-10 border-border focus:shadow-md transition-all duration-200"
                  {...loginForm.register("password")}
                />
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-xs text-destructive mt-1">
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 mt-2 font-medium bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:scale-[1.01] transition-all duration-200"
              disabled={carregando}
            >
              {carregando ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Autenticando...
                </>
              ) : (
                "Entrar no Sistema"
              )}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3 justify-center border-t border-border/40 pt-4 bg-muted/20 pb-6 rounded-b-2xl">
        {forgotMode && (
          <button
            type="button"
            className="flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setForgotMode(false)}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Voltar para o login
          </button>
        )}
      </CardFooter>
    </Card>
  )
}
