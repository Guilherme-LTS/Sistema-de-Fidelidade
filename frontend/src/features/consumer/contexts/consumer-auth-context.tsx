"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabaseConsumerClient as supabase } from "@/lib/supabase-clients"
import {
  getStoredConsumerToken as getStoredAccessToken,
  setStoredConsumerToken as setStoredAccessToken,
  clearStoredConsumerToken as clearStoredAccessToken,
} from "@/lib/auth/session"
import { carregarDashboardConsumer, ConsumerDashboardData } from "../consumer.api"
import { routes } from "@/config/routes"

interface ConsumerAuthContextType {
  data: ConsumerDashboardData | null
  loading: boolean
  login: (email: string, password: string) => Promise<ConsumerDashboardData>
  logout: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
}

const ConsumerAuthContext = createContext<ConsumerAuthContextType | undefined>(undefined)

function decodeJwt(token: string): any {
  try {
    const base64Url = token.split(".")[1]
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    )
    return JSON.parse(jsonPayload)
  } catch (e) {
    return null
  }
}

export function ConsumerAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  
  const [hasToken, setHasToken] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Consumer Auth] onAuthStateChange event: ${event}`, session?.user?.email)
      
      if (session) {
        setStoredAccessToken(session.access_token)
        setHasToken(true)
      } else {
        clearStoredAccessToken()
        setHasToken(false)
        queryClient.removeQueries({ queryKey: ["consumer-dashboard"] })
      }
      setIsInitializing(false)
    })

    const initTimeout = setTimeout(() => {
      setIsInitializing(false)
    }, 3000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStoredAccessToken(session.access_token)
        setHasToken(true)
      } else {
        const localToken = getStoredAccessToken()
        if (localToken) {
          const decoded = decodeJwt(localToken)
          if (decoded && decoded.exp && decoded.exp * 1000 > Date.now()) {
            setHasToken(true)
          } else {
            clearStoredAccessToken()
            setHasToken(false)
          }
        } else {
          setHasToken(false)
        }
      }
      setIsInitializing(false)
    }).catch((err) => {
      console.error("[Consumer Auth] Erro ao buscar sessão inicial:", err)
      setIsInitializing(false)
    })

    return () => {
      clearTimeout(initTimeout)
      subscription.unsubscribe()
    }
  }, [queryClient])

  const { 
    data: consumerData = null, 
    isLoading: isQueryLoading,
    isError,
    error
  } = useQuery({
    queryKey: ["consumer-dashboard"],
    queryFn: carregarDashboardConsumer,
    enabled: hasToken && !isInitializing,
    retry: false,
    staleTime: 1000 * 60 * 5,
  })

  useEffect(() => {
    if (isError) {
      console.error("[Consumer Auth] Query failed with error:", error)
      clearStoredAccessToken()
      setHasToken(false)
      queryClient.removeQueries({ queryKey: ["consumer-dashboard"] })
      supabase.auth.signOut().catch((e) => {
        console.warn("[Consumer Auth] Erro ao deslogar após falha:", e)
      })
    }
  }, [isError, error, queryClient])

  const login = async (email: string, password: string): Promise<ConsumerDashboardData> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("E-mail, CPF ou senha inválidos.")
        }
        if (error.message.includes("Email not confirmed")) {
          throw new Error("E-mail não confirmado. Verifique sua caixa de entrada.")
        }
        if (error.message.includes("Password should be at least")) {
          throw new Error("A senha deve ter pelo menos 6 caracteres.")
        }
        throw new Error("Não foi possível realizar o login. Verifique suas credenciais.")
      }

      if (!data?.session) {
        throw new Error("Sessão não pôde ser estabelecida.")
      }

      const token = data.session.access_token
      setStoredAccessToken(token)
      setHasToken(true)

      const dashData = await queryClient.fetchQuery({
        queryKey: ["consumer-dashboard"],
        queryFn: carregarDashboardConsumer,
      })

      return dashData
    } catch (err) {
      clearStoredAccessToken()
      setHasToken(false)
      queryClient.removeQueries({ queryKey: ["consumer-dashboard"] })
      throw err
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.warn("Erro ao fazer logout no Supabase:", e)
    } finally {
      clearStoredAccessToken()
      setHasToken(false)
      queryClient.removeQueries({ queryKey: ["consumer-dashboard"] })
      router.push("/acesso")
    }
  }

  const sendPasswordReset = async (email: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/acesso?recovery=1`, // Adjust to consumer reset if needed
    })

    if (error) {
      throw new Error(error.message)
    }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      throw new Error(error.message)
    }
  }

  const loading = isInitializing || (hasToken && isQueryLoading)

  return (
    <ConsumerAuthContext.Provider value={{ data: consumerData, loading, login, logout, sendPasswordReset, updatePassword }}>
      {children}
    </ConsumerAuthContext.Provider>
  )
}

export function useConsumerAuth() {
  const context = useContext(ConsumerAuthContext)
  if (context === undefined) {
    throw new Error("useConsumerAuth deve ser utilizado dentro de um ConsumerAuthProvider")
  }
  return context
}
