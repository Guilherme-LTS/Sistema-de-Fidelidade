import { LoginForm } from "@/features/auth/components/login-form"
import { AuthProvider } from "@/lib/auth/auth-context"
import { Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Star, TrendingUp, ShieldCheck } from "lucide-react"

export default function LoginPage() {
  return (
    <main className="flex min-h-screen bg-background relative overflow-hidden flex-col items-center justify-center p-4 pt-24 pb-8">
      
      {/* Elegant Radial Gradient Background */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      
      <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-12">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o início
        </Link>
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        <div className="text-center mb-8">
          <div className="mx-auto flex justify-center">
            <Image src="/logo-light.png" alt="Pontus Logo" width={200} height={55} className="dark:hidden" priority  style={{ width: "auto", height: "auto" }} />
            <Image src="/logo-dark.png" alt="Pontus Logo" width={200} height={55} className="hidden dark:block" priority  style={{ width: "auto", height: "auto" }} />
          </div>
        </div>

        <div className="w-full">
          <Suspense fallback={<div className="text-sm text-center text-muted-foreground">Carregando formulário...</div>}>
            <AuthProvider>
              <LoginForm />
            </AuthProvider>
          </Suspense>
        </div>
      </div>

    </main>
  )
}
