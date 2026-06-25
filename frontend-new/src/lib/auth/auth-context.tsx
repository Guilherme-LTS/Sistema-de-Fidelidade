"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import {
  getStoredAccessToken,
  setStoredAccessToken,
  clearStoredAccessToken,
} from "@/lib/auth/session"
import { carregarPerfilAtual } from "@/features/auth/auth.api"
import { UsuarioPerfil } from "@/lib/api/types"
import { routes } from "@/config/routes"

interface AuthContextType {
  user: UsuarioPerfil | null
  loading: boolean
  login: (email: string, password: string) => Promise<UsuarioPerfil>
  logout: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  
  // Controle local para saber se devemos buscar o perfil na API
  const [hasToken, setHasToken] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    // 1. Ouvir mudanças no estado de autenticação do Supabase (ex: login, logout, token refreshed)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth Context] onAuthStateChange event: ${event}`, session?.user?.email)
      
      if (session) {
        setStoredAccessToken(session.access_token)
        setHasToken(true)
      } else {
        clearStoredAccessToken()
        setHasToken(false)
        queryClient.removeQueries({ queryKey: ["auth-profile"] })
      }
      setIsInitializing(false)
    })

    // Fallback de segurança: se o Supabase travar por algum motivo (ex: Web Locks), libera a interface após 3 segundos
    const initTimeout = setTimeout(() => {
      setIsInitializing(false)
    }, 3000)

    // 2. Carregar sessão inicial de forma assíncrona (com auto-refresh se necessário)
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
      console.error("[Auth Context] Erro ao buscar sessão inicial:", err)
      setIsInitializing(false)
    })

    return () => {
      clearTimeout(initTimeout)
      subscription.unsubscribe()
    }
  }, [queryClient])

  // O React Query gerencia o cache e o ciclo de vida dos dados do usuário
  const { 
    data: userProfile = null, 
    isLoading: isQueryLoading,
    isError
  } = useQuery({
    queryKey: ["auth-profile"],
    queryFn: carregarPerfilAtual,
    enabled: hasToken && !isInitializing,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutos de cache em memória
  })

  // Se a query falhar (ex: token inválido ou usuário inativo no BD), limpamos a sessão
  useEffect(() => {
    if (isError) {
      clearStoredAccessToken()
      setHasToken(false)
      queryClient.removeQueries({ queryKey: ["auth-profile"] })
      // Força o logout também no Supabase para sincronizar e evitar loops de reconexão
      supabase.auth.signOut().catch((e) => {
        console.warn("[Auth Context] Erro ao deslogar após falha de perfil:", e)
      })
    }
  }, [isError, queryClient])

  const login = async (email: string, password: string): Promise<UsuarioPerfil> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("E-mail ou senha inválidos.")
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

      // Busca e cacheia o perfil imediatamente
      const perfil = await queryClient.fetchQuery({
        queryKey: ["auth-profile"],
        queryFn: carregarPerfilAtual,
      })

      return perfil
    } catch (err) {
      clearStoredAccessToken()
      setHasToken(false)
      queryClient.removeQueries({ queryKey: ["auth-profile"] })
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
      queryClient.removeQueries({ queryKey: ["auth-profile"] })
      router.push(routes.auth.login)
    }
  }

  const sendPasswordReset = async (email: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/alterar-senha?recovery=1`,
    })

    if (error) {
      throw new Error(error.message)
    }
  }

  const loading = isInitializing || (hasToken && isQueryLoading)

  return (
    <AuthContext.Provider value={{ user: userProfile, loading, login, logout, sendPasswordReset }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider")
  }
  return context
}
