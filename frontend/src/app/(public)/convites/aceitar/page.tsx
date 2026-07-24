"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth, AuthProvider } from "@/lib/auth/auth-context"
import { obterConvitePublico, aceitarConvite, PublicInvitation } from "@/features/auth/auth.api"
import { supabaseAdminClient as supabase } from "@/lib/supabase-clients"
import { mapAuthError } from "@/lib/auth/error-mapping"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Mail, Lock, User, CheckCircle2, AlertTriangle, LogOut, ShieldCheck, Eye, EyeOff } from "lucide-react"

function AceitarConviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  
  const { user, login, logout, refreshTenants } = useAuth()
  const queryClient = useQueryClient()
  
  const [invite, setInvite] = useState<PublicInvitation | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(true)
  const [errorInvite, setErrorInvite] = useState<string | null>(null)
  
  const [activeTab, setActiveTab] = useState<"register" | "login">("register")
  const [submitting, setSubmitting] = useState(false)
  
  // Show/Hide password states
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  
  // Form fields
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const isEmailMatching = user && invite && user.email === invite.email

  useEffect(() => {
    if (!token) {
      setErrorInvite("Token de convite não fornecido na URL.")
      setLoadingInvite(false)
      return
    }

    async function fetchInvite() {
      try {
        const data = await obterConvitePublico(token!)
        setInvite(data)
      } catch (err: any) {
        setErrorInvite(err.message || "Não foi possível carregar as informações do convite.")
      } finally {
        setLoadingInvite(false)
      }
    }

    fetchInvite()
  }, [token])

  useEffect(() => {
    if (isEmailMatching && !submitting) {
      handleAcceptExisting()
    }
  }, [user, invite, isEmailMatching])

  const handleAcceptExisting = async () => {
    if (!token) return
    setSubmitting(true)
    try {
      await aceitarConvite(token)
      await queryClient.invalidateQueries({ queryKey: ["auth-profile"] })
      await queryClient.refetchQueries({ queryKey: ["auth-profile"] })
      await refreshTenants()
      toast.success("Convite aceito com sucesso! Bem-vindo à equipe.")
      router.push("/admin/dashboard")
    } catch (err: any) {
      toast.error(err.message || "Erro ao aceitar convite.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleRegisterAndAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invite || !token) return
    
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.")
      return
    }
    
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.")
      return
    }

    setSubmitting(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/convites/aceitar?token=${token}`,
          data: {
            name: name || invite.email.split("@")[0],
          }
        }
      })

      if (error) throw mapAuthError(error)

      if (data?.session) {
        await aceitarConvite(token)
        await queryClient.invalidateQueries({ queryKey: ["auth-profile"] })
        await queryClient.refetchQueries({ queryKey: ["auth-profile"] })
        await refreshTenants()
        toast.success("Cadastro concluído e convite aceito com sucesso!")
        router.push("/admin/dashboard")
      } else {
        router.push(`/confirmacao-pendente?email=${encodeURIComponent(invite.email)}&token=${token}`)
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao realizar cadastro.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleLoginAndAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invite || !token) return

    setSubmitting(true)
    try {
      await login(invite.email, password)
      await aceitarConvite(token)
      await queryClient.invalidateQueries({ queryKey: ["auth-profile"] })
      await queryClient.refetchQueries({ queryKey: ["auth-profile"] })
      await refreshTenants()
      toast.success("Login realizado e convite aceito com sucesso!")
      router.push("/admin/dashboard")
    } catch (err: any) {
      toast.error(err.message || "Erro ao realizar login ou aceitar convite.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      toast.success("Desconectado com sucesso.")
    } catch (err) {
      toast.error("Erro ao desconectar.")
    }
  }

  if (loadingInvite) {
    return (
      <div className="flex h-[350px] items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner className="w-10 h-10 text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Carregando detalhes do convite...</p>
        </div>
      </div>
    )
  }

  if (errorInvite) {
    return (
      <Card className="w-full max-w-[420px] shadow-2xl border-destructive/20 bg-card/65 backdrop-blur-md rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[4px] bg-destructive" />
        <CardHeader className="text-center pt-8">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 bg-destructive/10 rounded-2xl flex items-center justify-center border border-destructive/20">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold text-foreground">Convite Inválido</CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-2">
            {errorInvite}
          </CardDescription>
        </CardHeader>
        <CardFooter className="pb-8 pt-4 flex justify-center">
          <Button onClick={() => router.push("/")} className="w-full">
            Ir para a Página Inicial
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-[460px] shadow-2xl border-border bg-card/70 backdrop-blur-md rounded-2xl relative overflow-hidden transition-all">
      <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary via-emerald-500 to-teal-500" />
      
      <CardHeader className="space-y-2 text-center pt-8">
        <div className="flex justify-center mb-2 animate-pulse">
          <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          Convite Aceito!
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm px-4">
          Você foi convidado para a equipe do estabelecimento <strong>{invite?.tenantName}</strong> como <strong>{invite?.role === "admin" ? "Administrador" : invite?.role === "operador" ? "Operador" : "Novato"}</strong>.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {user ? (
          isEmailMatching ? (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-left">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Conectado como:</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button 
                onClick={handleAcceptExisting} 
                className="w-full h-11 font-medium bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/25 transition-all"
                disabled={submitting}
              >
                {submitting ? <Spinner className="mr-2 h-4 w-4" /> : "Aceitar Convite e Entrar"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-left">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Conexão Incorreta</p>
                  <p className="text-xs text-muted-foreground">
                    Você está conectado como <strong>{user.email}</strong>, mas este convite foi enviado para <strong>{invite?.email}</strong>.
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={handleLogout} 
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
              >
                <LogOut className="h-4 w-4" /> Desconectar de {user.email}
              </Button>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("register")}
                className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-all ${
                  activeTab === "register" 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Criar Minha Conta
              </button>
              <button
                onClick={() => setActiveTab("login")}
                className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-all ${
                  activeTab === "login" 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Já Tenho Conta
              </button>
            </div>

            <div className="pt-2">
              {activeTab === "register" ? (
                <form onSubmit={handleRegisterAndAccept} className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">E-mail (Definido pelo convite)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="email" 
                        value={invite?.email || ""} 
                        disabled 
                        className="pl-10 bg-muted text-muted-foreground cursor-not-allowed" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Seu Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="text" 
                        placeholder="Ex: João Silva" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="pl-10" 
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Criar Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Mínimo 6 caracteres" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="pl-10 pr-10" 
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Confirmar Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type={showConfirmPassword ? "text" : "password"} 
                        placeholder="Confirme sua senha" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        className="pl-10 pr-10" 
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-10 font-medium bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl transition-all"
                    disabled={submitting}
                  >
                    {submitting ? <Spinner className="mr-2 h-4 w-4" /> : "Concluir Cadastro e Entrar"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleLoginAndAccept} className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="email" 
                        value={invite?.email || ""} 
                        disabled 
                        className="pl-10 bg-muted text-muted-foreground cursor-not-allowed" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Sua Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type={showLoginPassword ? "text" : "password"} 
                        placeholder="Insira sua senha" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="pl-10 pr-10" 
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-10 font-medium bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl transition-all"
                    disabled={submitting}
                  >
                    {submitting ? <Spinner className="mr-2 h-4 w-4" /> : "Entrar e Aceitar Convite"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function AceitarConvitePage() {
  return (
    <main className="flex min-h-screen bg-background relative flex-col items-center justify-center p-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

      <div className="w-full max-w-[460px] relative z-10">
        <AuthProvider>
          <Suspense fallback={
            <Card className="w-full max-w-[460px] shadow-2xl border-border bg-card/70 backdrop-blur-md rounded-2xl relative overflow-hidden p-6 text-center space-y-4">
              <Spinner className="w-10 h-10 text-primary mx-auto animate-spin" />
              <p className="text-muted-foreground text-sm">Carregando detalhes do convite...</p>
            </Card>
          }>
            <AceitarConviteContent />
          </Suspense>
        </AuthProvider>
      </div>
    </main>
  )
}
