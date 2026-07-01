"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Building2, Mail, Lock, Phone, User, Store, ArrowRight, ShieldCheck, MailCheck } from "lucide-react"

import { supabaseAdminClient as supabase } from "@/lib/supabase-clients"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { routes } from "@/config/routes"
import { formatCNPJ, formatPhone, isValidCNPJ, getPasswordStrength } from "@/lib/masks"

const signupSchema = z.object({
  tenantName: z.string().min(3, { message: "O nome do estabelecimento deve ter no mínimo 3 caracteres." }),
  adminName: z.string().min(3, { message: "Seu nome deve ter no mínimo 3 caracteres." }),
  email: z.string().email({ message: "E-mail inválido." }),
  phone: z.string().min(14, { message: "Telefone inválido." }), // (XX) XXXXX-XXXX = 15 chars, or (XX) XXXX-XXXX = 14
  document: z.string().optional(),
  password: z.string()
    .min(8, { message: "A senha deve ter no mínimo 8 caracteres." })
    .regex(/[A-Z]/, { message: "A senha deve conter pelo menos uma letra maiúscula." })
    .regex(/[0-9]/, { message: "A senha deve conter pelo menos um número." }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
}).refine((data) => {
  if (!data.document) return true;
  return isValidCNPJ(data.document);
}, {
  message: "CNPJ inválido.",
  path: ["document"],
})

type SignupFormValues = z.infer<typeof signupSchema>

export function CadastroForm() {
  const [carregando, setCarregando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [passwordScore, setPasswordScore] = useState(0)
  const router = useRouter()

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { 
      tenantName: "",
      adminName: "",
      email: "",
      phone: "",
      document: "",
      password: "", 
      confirmPassword: "" 
    },
    mode: "onChange",
  })

  // Watch password to update strength indicator
  const watchPassword = form.watch("password")
  
  useEffect(() => {
    setPasswordScore(getPasswordStrength(watchPassword))
  }, [watchPassword])

  // Handle Masks
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue("phone", formatPhone(e.target.value), { shouldValidate: true })
  }

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue("document", formatCNPJ(e.target.value), { shouldValidate: true })
  }

  const onSubmit = async (values: SignupFormValues) => {
    setCarregando(true)
    try {
      // Limpar os dados antes de enviar
      const cleanPhone = values.phone.replace(/\D/g, "")
      const cleanDocument = values.document ? values.document.replace(/\D/g, "") : ""

      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            tenantName: values.tenantName,
            adminName: values.adminName,
            phone: cleanPhone,
            document: cleanDocument,
          }
        }
      })

      if (error) {
        if (error.message.includes("User already registered")) {
          throw new Error("Este e-mail já está cadastrado em nosso sistema.")
        }
        throw new Error(error.message)
      }

      setSucesso(true)
    } catch (err: any) {
      toast.error(err.message || "Erro ao realizar cadastro.")
    } finally {
      setCarregando(false)
    }
  }

  if (sucesso) {
    return (
      <Card className="w-full max-w-lg shadow-2xl border-border bg-card/65 backdrop-blur-md rounded-2xl relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary via-emerald-500 to-teal-500" />
        
        <CardHeader className="space-y-2 text-center pt-8 pb-4">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
              <MailCheck className="h-8 w-8 text-emerald-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Quase lá!
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground px-4 mt-2">
            Enviamos um e-mail de confirmação para <strong>{form.getValues("email")}</strong>. 
            <br/><br/>
            Por favor, clique no link recebido para validar sua conta e começar a usar o Fidelidade Pro.
          </CardDescription>
        </CardHeader>
        <CardFooter className="pt-4 pb-8 flex justify-center">
          <Button 
            variant="outline" 
            className="w-full max-w-xs"
            onClick={() => router.push(routes.auth.login)}
          >
            Ir para o Login
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-xl shadow-2xl border-border bg-card/65 backdrop-blur-md rounded-2xl relative overflow-hidden transition-all duration-300">
      <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary via-emerald-500 to-teal-500" />
      
      <CardHeader className="space-y-2 text-center pt-8">
        <div className="flex justify-center mb-2">
          <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          Crie sua Conta
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs px-4">
          Preencha os dados abaixo para configurar seu programa de fidelidade.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome do Restaurante */}
            <div className="space-y-2">
              <Label htmlFor="tenantName" className="text-xs font-semibold text-foreground/80">
                Nome do Estabelecimento *
              </Label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="tenantName"
                  placeholder="Seu Restaurante"
                  className="pl-10 h-10 border-border focus:shadow-md transition-all duration-200"
                  {...form.register("tenantName")}
                />
              </div>
              {form.formState.errors.tenantName && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.tenantName.message}</p>
              )}
            </div>

            {/* CNPJ */}
            <div className="space-y-2">
              <Label htmlFor="document" className="text-xs font-semibold text-foreground/80">
                CNPJ (Opcional)
              </Label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="document"
                  placeholder="00.000.000/0000-00"
                  className="pl-10 h-10 border-border focus:shadow-md transition-all duration-200"
                  {...form.register("document")}
                  onChange={handleDocumentChange}
                />
              </div>
              {form.formState.errors.document && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.document.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome do Admin */}
            <div className="space-y-2">
              <Label htmlFor="adminName" className="text-xs font-semibold text-foreground/80">
                Seu Nome *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="adminName"
                  placeholder="João da Silva"
                  className="pl-10 h-10 border-border focus:shadow-md transition-all duration-200"
                  {...form.register("adminName")}
                />
              </div>
              {form.formState.errors.adminName && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.adminName.message}</p>
              )}
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-semibold text-foreground/80">
                Telefone/WhatsApp *
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="(00) 00000-0000"
                  className="pl-10 h-10 border-border focus:shadow-md transition-all duration-200"
                  {...form.register("phone")}
                  onChange={handlePhoneChange}
                />
              </div>
              {form.formState.errors.phone && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.phone.message}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-semibold text-foreground/80">
              E-mail *
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="contato@restaurante.com.br"
                className="pl-10 h-10 border-border focus:shadow-md transition-all duration-200"
                {...form.register("email")}
              />
            </div>
            {form.formState.errors.email && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold text-foreground/80">
                Senha *
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
                <p className="text-xs text-destructive mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground/80">
                Confirmar Senha *
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
                <p className="text-xs text-destructive mt-1">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 mt-4 font-medium bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:scale-[1.01] transition-all duration-200"
            disabled={carregando}
          >
            {carregando ? (
              <>
                <Spinner className="mr-2 h-4 w-4" /> Criando Conta...
              </>
            ) : (
              <>
                Criar Conta Grátis <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 justify-center border-t border-border/40 pt-4 bg-muted/20 pb-6 rounded-b-2xl">
        <div className="text-xs text-center text-muted-foreground">
          Já possui uma conta?{" "}
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => router.push(routes.auth.login)}
          >
            Fazer Login
          </button>
        </div>
      </CardFooter>
    </Card>
  )
}
