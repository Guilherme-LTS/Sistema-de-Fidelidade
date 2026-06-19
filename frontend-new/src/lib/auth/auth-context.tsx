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
    const token = getStoredAccessToken()
    if (token) {
      const decoded = decodeJwt(token)
      if (decoded && decoded.exp && decoded.exp * 1000 < Date.now()) {
        clearStoredAccessToken()
        setHasToken(false)
      } else {
        setHasToken(true)
      }
    } else {
      setHasToken(false)
    }
    setIsInitializing(false)
  }, [])

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
    }
  }, [isError, queryClient])

  const login = async (email: string, password: string): Promise<UsuarioPerfil> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw new Error(error.message)
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
