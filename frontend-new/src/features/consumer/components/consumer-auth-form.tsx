"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cpfMask } from "@/lib/masks"

// ---- Schemas ----
const loginSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
})

const signupSchema = z.object({
  name: z.string().min(3, "Nome muito curto."),
  cpf: z.string().length(14, "CPF incompleto."),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
})

type LoginFormValues = z.infer<typeof loginSchema>
type SignupFormValues = z.infer<typeof signupSchema>

interface ConsumerAuthFormProps {
  tenantName: string
}

export function ConsumerAuthForm({ tenantName }: ConsumerAuthFormProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", cpf: "", email: "", password: "" },
  })

  const onLoginSubmit = async (values: LoginFormValues) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })

      if (error) throw error

      toast.success("Login realizado com sucesso!")
      router.push("/painel")
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer login.")
    } finally {
      setLoading(false)
    }
  }

  const onSignupSubmit = async (values: SignupFormValues) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            isConsumer: 'true',
            name: values.name,
            document: values.cpf.replace(/\D/g, ''), // Salva apenas números
          }
        }
      })

      if (error) throw error

      toast.success("Conta criada! Você já pode acessar seu painel.")
      router.push("/painel")
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar conta.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Tabs defaultValue="signup" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="login">Já tenho conta</TabsTrigger>
        <TabsTrigger value="signup">Primeiro Acesso</TabsTrigger>
      </TabsList>

      <TabsContent value="login" className="space-y-4">
        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">E-mail</Label>
            <Input
              id="login-email"
              placeholder="seu@email.com"
              {...loginForm.register("email")}
            />
            {loginForm.formState.errors.email && (
              <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Senha</Label>
            <Input
              id="login-password"
              type="password"
              placeholder="••••••••"
              {...loginForm.register("password")}
            />
            {loginForm.formState.errors.password && (
              <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner className="mr-2" /> : "Entrar"}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="signup" className="space-y-4">
        <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-cpf">CPF (O mesmo informado no balcão)</Label>
            <Input
              id="signup-cpf"
              placeholder="000.000.000-00"
              {...signupForm.register("cpf", {
                onChange: (e) => {
                  e.target.value = cpfMask(e.target.value)
                }
              })}
            />
            {signupForm.formState.errors.cpf && (
              <p className="text-xs text-destructive">{signupForm.formState.errors.cpf.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-name">Nome Completo</Label>
            <Input
              id="signup-name"
              placeholder="João da Silva"
              {...signupForm.register("name")}
            />
            {signupForm.formState.errors.name && (
              <p className="text-xs text-destructive">{signupForm.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email">E-mail (Para acessar sua conta)</Label>
            <Input
              id="signup-email"
              type="email"
              placeholder="joao@email.com"
              {...signupForm.register("email")}
            />
            {signupForm.formState.errors.email && (
              <p className="text-xs text-destructive">{signupForm.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">Criar Senha</Label>
            <Input
              id="signup-password"
              type="password"
              placeholder="••••••••"
              {...signupForm.register("password")}
            />
            {signupForm.formState.errors.password && (
              <p className="text-xs text-destructive">{signupForm.formState.errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner className="mr-2" /> : "Ver Meus Pontos"}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  )
}
