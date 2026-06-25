import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { getStoredAccessToken } from "@/lib/auth/session"
import { AuthProvider } from "@/lib/auth/auth-context"

export default function ConsumerLayout({ children }: { children: ReactNode }) {
  // O layout do consumidor também precisa do AuthProvider (que é o mesmo Context)
  // Mas a proteção de rota pode ser feita verificando a role no AuthContext ou aqui num middleware.
  
  return (
    <AuthProvider>
      <div className="min-h-screen bg-muted/30">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <div className="mr-4 flex">
              <span className="font-bold sm:inline-block">Fidelidade</span>
            </div>
          </div>
        </header>
        <main className="container max-w-lg mx-auto py-6">
          {children}
        </main>
      </div>
    </AuthProvider>
  )
}
