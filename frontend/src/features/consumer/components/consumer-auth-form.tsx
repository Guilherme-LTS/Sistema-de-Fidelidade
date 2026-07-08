"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { supabaseConsumerClient as supabase } from "@/lib/supabase-clients"
import { api } from "@/lib/api/client"
import { setStoredConsumerToken as setStoredAccessToken } from "@/lib/auth/session"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCPF, getPasswordStrength } from "@/lib/masks"
import { QuickCheckPanel } from "./quick-check-panel"
import { Eye, EyeOff, MailCheck, Lock } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

function extractErrorMessage(err: any): string {
  if (!err) return "Erro interno do sistema. Tente novamente em alguns minutos."
  
  // Extrai mensagem da API (se houver)
  const apiMessage = err.response?.data?.error?.message || err.response?.data?.message;
  if (typeof apiMessage === 'string' && apiMessage.trim() !== '' && apiMessage !== '{}') {
    return apiMessage;
  }
  
  // Extrai do objeto de erro nativo
  if (typeof err.message === 'string' && err.message.trim() !== '' && err.message !== '{}') {
    // Se for um erro genérico de rede do Axios que vaza pro usuário
    if (err.message.includes("Request failed with status code 500")) {
      return "Erro interno do sistema. Tente novamente em alguns minutos."
    }
    return err.message;
  }
  
  return "Erro interno do sistema. Tente novamente em alguns minutos."
}

// ---- Schemas ----
const loginSchema = z.object({
  identifier: z.string().min(1, "Informe seu CPF ou E-mail."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
})

const signupSchema = z.object({
  name: z.string().min(3, "Nome muito curto."),
  cpf: z.string().length(14, "CPF incompleto."),
  email: z.string().email("E-mail inválido."),
  password: z.string()
    .min(8, "A senha deve ter no mínimo 8 caracteres.")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula.")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número."),
  confirmPassword: z.string(),
  termsConsent: z.boolean().refine((val) => val === true, {
    message: "Você deve aceitar a Política de Privacidade.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
})

const forgotSchema = z.object({
  identifier: z.string().min(1, "Informe seu CPF ou E-mail."),
})

type LoginFormValues = z.infer<typeof loginSchema>
type SignupFormValues = z.infer<typeof signupSchema>
type ForgotFormValues = z.infer<typeof forgotSchema>

interface ConsumerAuthFormProps {
  tenantName: string
  tenantSlug?: string
}

export function ConsumerAuthForm({ tenantName, tenantSlug }: ConsumerAuthFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (searchParams.has("entrar")) return "login"
    if (searchParams.has("cadastro")) return "signup"
    return "quick-check"
  })

  useEffect(() => {
    const infoMsg = searchParams.get("info")
    if (infoMsg === "first_confirmation") {
      const timer = setTimeout(() => {
        toast.info("Primeira confirmação realizada com sucesso! Por favor, acesse o outro e-mail para confirmar a alteração.", { duration: 8000 })
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.delete("pontos")
    newParams.delete("entrar")
    newParams.delete("cadastro")
    
    if (value === "login") newParams.set("entrar", "")
    else if (value === "signup") newParams.set("cadastro", "")
    else if (value === "quick-check") newParams.set("pontos", "")
    
    const queryStr = newParams.toString().replace(/=&/g, '&').replace(/=$/, '')
    const targetUrl = queryStr ? `${pathname}?${queryStr}` : pathname
    router.replace(targetUrl, { scroll: false })
  }

  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotStatus, setForgotStatus] = useState<"IDLE" | "SUCCESS_EMAIL_SENT" | "POINTS_ONLY">("IDLE")
  const [forgotMaskedEmail, setForgotMaskedEmail] = useState<string>("")
  const [passwordScore, setPasswordScore] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const queryClient = useQueryClient()

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  })

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", cpf: "", email: "", password: "", confirmPassword: "", termsConsent: false },
    mode: "onChange",
  })

  const forgotForm = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { identifier: "" },
  })

  const watchPassword = signupForm.watch("password")
  
  useEffect(() => {
    setPasswordScore(getPasswordStrength(watchPassword))
  }, [watchPassword])

  const onLoginSubmit = async (values: LoginFormValues) => {
    setLoading(true)
    try {
      // Usamos a nossa nova rota inteligente que resolve CPF ou E-mail
      const res = await api.post<{ success: boolean; data: { session: any } }>("/public/consumer/login", {
        identifier: values.identifier,
        password: values.password,
      })

      if (res.data?.session) {
        // [FIX] Força a limpeza de qualquer sessão residual (ex: admin) antes de injetar a nova
        await supabase.auth.signOut()
        await supabase.auth.setSession(res.data.session)
        // [FIX] Injetamos o token sincronicamente para evitar Race Condition na rota destino
        setStoredAccessToken(res.data.session.access_token)
        // Removemos query state antiga para forçar reload do dado mais novo
        queryClient.removeQueries({ queryKey: ["consumer-dashboard"] })
      } else {
        throw new Error("Sessão não retornada pelo servidor.")
      }

      toast.success("Login realizado com sucesso!")
      router.push("/painel")
    } catch (err: any) {
      toast.error(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const onSignupSubmit = async (values: SignupFormValues) => {
    setLoading(true)
    try {
      const res = await api.post<{ success: boolean; data: { session: any } }>("/public/consumer/signup", {
        name: values.name,
        cpf: values.cpf.replace(/\D/g, ''),
        email: values.email,
        password: values.password,
      })

      if (res.data?.session) {
        // [FIX] Força a limpeza de qualquer sessão residual antes de injetar a nova
        await supabase.auth.signOut()
        await supabase.auth.setSession(res.data.session)
        // [FIX] Injetamos o token sincronicamente para evitar Race Condition
        setStoredAccessToken(res.data.session.access_token)
        queryClient.removeQueries({ queryKey: ["consumer-dashboard"] })
      } else {
        throw new Error("Sessão não retornada pelo servidor.")
      }

      toast.success("Conta criada! Você já pode acessar seu painel.")
      router.push("/painel")
    } catch (err: any) {
      toast.error(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const onForgotSubmit = async (values: ForgotFormValues) => {
    setLoading(true)
    try {
      const res = await api.post<{
        success: boolean;
        message?: string;
        data: {
          status: "SUCCESS_EMAIL_SENT" | "POINTS_ONLY";
          message: string;
          maskedEmail?: string;
        }
      }>("/public/consumer/recover-password", {
        identifier: values.identifier
      })
      
      const payload = res.data;
      if (payload.status === "POINTS_ONLY") {
        setForgotStatus("POINTS_ONLY")
      } else {
        setForgotStatus("SUCCESS_EMAIL_SENT")
        setForgotMaskedEmail(payload.maskedEmail || "")
        toast.success(payload.message || "Link enviado com sucesso!")
      }
    } catch (err: any) {
      toast.error(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (forgotMode) {
    if (forgotStatus !== "IDLE") {
      return (
        <div className="space-y-4 text-center py-4">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
              {forgotStatus === "SUCCESS_EMAIL_SENT" ? (
                <MailCheck className="h-7 w-7 text-primary" />
              ) : (
                <Lock className="h-7 w-7 text-amber-500" />
              )}
            </div>
          </div>
          <h3 className="font-bold text-lg text-foreground">
            {forgotStatus === "SUCCESS_EMAIL_SENT" ? "E-mail de Recuperação Enviado" : "Senha Não Cadastrada"}
          </h3>
          {forgotStatus === "SUCCESS_EMAIL_SENT" ? (
            <p className="text-sm text-muted-foreground leading-relaxed px-2">
              Enviamos um link para redefinição de senha para o e-mail <strong className="text-foreground font-semibold">{forgotMaskedEmail}</strong>. Verifique sua caixa de entrada e pasta de spam.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed px-2">
              Seu CPF possui pontos cadastrados no restaurante, mas você ainda não criou uma senha de acesso. Vá na aba <strong className="text-foreground font-semibold">&quot;Criar Conta&quot;</strong> para cadastrar sua senha.
            </p>
          )}
          <Button 
            type="button" 
            className="w-full mt-6" 
            onClick={() => {
              setForgotMode(false)
              const oldStatus = forgotStatus
              setForgotStatus("IDLE")
              setForgotMaskedEmail("")
              if (oldStatus === "POINTS_ONLY") {
                handleTabChange("signup")
              }
            }}
          >
            {forgotStatus === "POINTS_ONLY" ? "Ir para Criar Conta" : "Voltar para o login"}
          </Button>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="text-center space-y-1 mb-4">
          <h3 className="font-semibold text-lg">Recuperar Senha</h3>
          <p className="text-sm text-muted-foreground">Insira seu e-mail ou CPF para receber o link de acesso.</p>
        </div>
        <form onSubmit={forgotForm.handleSubmit(onForgotSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-identifier">CPF ou E-mail</Label>
            <Input
              id="forgot-identifier"
              type="text"
              placeholder="000.000.000-00 ou seu@email.com"
              {...forgotForm.register("identifier", {
                onChange: (e) => {
                  const val = e.target.value
                  if (/^\d/.test(val) && !val.includes("@")) {
                    e.target.value = formatCPF(val)
                  }
                }
              })}
            />
            {forgotForm.formState.errors.identifier && (
              <p className="text-xs text-destructive">{forgotForm.formState.errors.identifier.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner className="mr-2" /> : "Enviar link de recuperação"}
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            className="w-full" 
            onClick={() => setForgotMode(false)}
            disabled={loading}
          >
            Voltar para o login
          </Button>
        </form>
      </div>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="quick-check" className="text-xs sm:text-sm">Pontos</TabsTrigger>
        <TabsTrigger value="login" className="text-xs sm:text-sm">Entrar</TabsTrigger>
        <TabsTrigger value="signup" className="text-xs sm:text-sm">Criar Conta</TabsTrigger>
      </TabsList>

      <TabsContent value="quick-check" className="mt-0">
        <QuickCheckPanel 
          tenantSlug={tenantSlug} 
          onSwitchToLogin={() => handleTabChange("login")} 
        />
      </TabsContent>

      <TabsContent value="login" className="space-y-4 mt-0">
        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-identifier">CPF ou E-mail</Label>
            <Input
              id="login-identifier"
              placeholder="000.000.000-00 ou seu@email.com"
              {...loginForm.register("identifier", {
                onChange: (e) => {
                  const val = e.target.value
                  // Apply mask only if it looks like a CPF (numbers)
                  if (/^\d/.test(val) && !val.includes("@")) {
                    e.target.value = formatCPF(val)
                  }
                }
              })}
            />
            {loginForm.formState.errors.identifier && (
              <p className="text-xs text-destructive">{loginForm.formState.errors.identifier.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">Senha</Label>
              <button 
                type="button" 
                onClick={() => setForgotMode(true)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Esqueci minha senha
              </button>
            </div>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pr-10"
                {...loginForm.register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {loginForm.formState.errors.password && (
              <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner className="mr-2" /> : "Entrar"}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="signup" className="space-y-4 mt-0">
        <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-cpf">CPF</Label>
            <Input
              id="signup-cpf"
              placeholder="000.000.000-00"
              {...signupForm.register("cpf", {
                onChange: (e) => {
                  e.target.value = formatCPF(e.target.value)
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
            <div className="relative">
              <Input
                id="signup-password"
                type={showSignupPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pr-10"
                {...signupForm.register("password")}
              />
              <button
                type="button"
                onClick={() => setShowSignupPassword(!showSignupPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            {watchPassword?.length > 0 && (
              <div className="flex gap-1 mt-1.5 h-1.5 w-full rounded-full overflow-hidden bg-muted">
                <div className={`h-full transition-all duration-500 ${passwordScore >= 1 ? (passwordScore >= 3 ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-destructive'} w-1/4`} />
                <div className={`h-full transition-all duration-500 ${passwordScore >= 2 ? (passwordScore >= 3 ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-transparent'} w-1/4`} />
                <div className={`h-full transition-all duration-500 ${passwordScore >= 3 ? 'bg-emerald-500' : 'bg-transparent'} w-1/4`} />
                <div className={`h-full transition-all duration-500 ${passwordScore >= 4 ? 'bg-emerald-500' : 'bg-transparent'} w-1/4`} />
              </div>
            )}

            {signupForm.formState.errors.password && (
              <p className="text-xs text-destructive">{signupForm.formState.errors.password.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="signup-confirm-password">Confirmar Senha</Label>
            <div className="relative">
              <Input
                id="signup-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pr-10"
                {...signupForm.register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {signupForm.formState.errors.confirmPassword && (
              <p className="text-xs text-destructive">{signupForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="flex items-start gap-2 pt-2">
            <Checkbox 
              id="signup-terms" 
              checked={signupForm.watch("termsConsent")}
              onCheckedChange={(checked) => signupForm.setValue("termsConsent", checked === true, { shouldValidate: true })}
            />
            <div className="grid gap-1.5 leading-none">
              <Label 
                htmlFor="signup-terms" 
                className="text-xs text-muted-foreground font-normal leading-relaxed select-none cursor-pointer"
              >
                Declaro que li e concordo com os{" "}
                <Link href="/regulamento" className="text-primary font-medium hover:underline">Termos de Uso</Link>{" "}
                e{" "}
                <Link href="/privacidade" className="text-primary font-medium hover:underline">Política de Privacidade</Link>{" "}
                da plataforma.
              </Label>
              {signupForm.formState.errors.termsConsent && (
                <p className="text-xs text-destructive">{signupForm.formState.errors.termsConsent.message}</p>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full mt-4" disabled={loading}>
            {loading ? <Spinner className="mr-2" /> : "Ver Meus Pontos"}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  )
}
