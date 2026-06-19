"use client"

import { useAuth } from "@/lib/auth/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, ReactNode } from "react"
import { routes } from "@/config/routes"
import { Spinner } from "@/components/ui/spinner"

interface AuthGuardProps {
  children: ReactNode
  requireAdmin?: boolean
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(routes.auth.login)
      } else if (requireAdmin && user.role !== "admin") {
        router.push(routes.auth.login)
      }
    }
  }, [user, loading, router, requireAdmin])

  if (loading || !user || (requireAdmin && user.role !== "admin")) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-xs text-muted-foreground animate-pulse">Verificando credenciais...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
