"use client"

import { useConsumerAuth } from "@/features/consumer/contexts/consumer-auth-context"
import { useRouter } from "next/navigation"
import { useEffect, ReactNode } from "react"
import { Spinner } from "@/components/ui/spinner"

interface ConsumerAuthGuardProps {
  children: ReactNode
}

export function ConsumerAuthGuard({ children }: ConsumerAuthGuardProps) {
  const { data, loading } = useConsumerAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !data) {
      router.push("/acesso")
    }
  }, [data, loading, router])

  if (loading || !data) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-xs text-muted-foreground animate-pulse">Verificando acesso...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
