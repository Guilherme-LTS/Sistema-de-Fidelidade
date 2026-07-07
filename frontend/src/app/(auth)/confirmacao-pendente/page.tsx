"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { supabaseAdminClient as supabase } from "@/lib/supabase-clients"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { MailCheck, ArrowLeft, Send } from "lucide-react"
import { toast } from "sonner"
import { routes } from "@/config/routes"

function ConfirmacaoPendenteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get("email") || ""
  const token = searchParams.get("token") || ""

  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(60)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleResend = async () => {
    if (!email || countdown > 0 || resending) return
    setResending(true)

    try {
      const redirectUrl = token
        ? `${window.location.origin}/auth/callback?next=/convites/aceitar?token=${token}`
        : `${window.location.origin}/auth/callback?next=/admin/dashboard`

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      })

      if (error) throw error

      toast.success("E-mail de confirmação reenviado com sucesso!")
      setCountdown(60)
    } catch (err: any) {
      toast.error(err.message || "Erro ao reenviar e-mail de confirmação.")
    } finally {
      setResending(false)
    }
  }

  return (
    <Card className="w-full max-w-lg shadow-2xl border-border bg-card/65 backdrop-blur-md rounded-2xl relative overflow-hidden transition-all duration-300">
      <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary via-emerald-500 to-teal-500" />
      
      <CardHeader className="space-y-2 text-center pt-8 pb-4">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 animate-pulse">
            <MailCheck className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          Confirme seu E-mail
        </CardTitle>
        <CardDescription className="text-base text-muted-foreground px-4 mt-2">
          Enviamos um link de confirmação para:
          <br />
          <strong className="text-foreground block mt-1 break-all">{email || "seu e-mail registrado"}</strong>
          <br />
          Por favor, acesse sua caixa de entrada e clique no link para ativar sua conta no Pontus.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        <div className="text-xs text-center text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
          Dica: Verifique também a sua caixa de Spam ou Lixo Eletrônico caso o e-mail não apareça em alguns minutos.
        </div>
      </CardContent>

      <CardFooter className="pt-4 pb-8 flex flex-col gap-3">
        <Button 
          onClick={handleResend}
          className="w-full h-10 font-medium bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
          disabled={resending || countdown > 0 || !email}
        >
          {resending ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {countdown > 0 
            ? `Reenviar em ${countdown}s` 
            : "Reenviar e-mail de confirmação"}
        </Button>

        <Button 
          variant="ghost" 
          className="w-full h-10 gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.push(routes.auth.login)}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o Login
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function ConfirmacaoPendentePage() {
  return (
    <main className="flex min-h-screen bg-background relative flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      
      <div className="w-full max-w-lg relative z-10">
        <Suspense fallback={
          <Card className="w-full max-w-lg shadow-2xl border-border bg-card/65 backdrop-blur-md rounded-2xl p-8 text-center space-y-4">
            <Spinner className="w-10 h-10 text-primary mx-auto animate-spin" />
            <p className="text-muted-foreground text-sm">Carregando...</p>
          </Card>
        }>
          <ConfirmacaoPendenteContent />
        </Suspense>
      </div>
    </main>
  )
}
