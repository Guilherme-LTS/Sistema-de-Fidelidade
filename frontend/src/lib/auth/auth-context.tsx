"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabaseAdminClient as supabase } from "@/lib/supabase-clients"
import {
  getStoredAdminToken as getStoredAccessToken,
  setStoredAdminToken as setStoredAccessToken,
  clearStoredAdminToken as clearStoredAccessToken,
} from "@/lib/auth/session"
import { carregarPerfilAtual, carregarTenants, UserTenant } from "@/features/auth/auth.api"
import { UsuarioPerfil } from "@/lib/api/types"
import { routes } from "@/config/routes"
import { mapAuthError } from "./error-mapping"

interface AuthContextType {
  user: UsuarioPerfil | null
  loading: boolean
  login: (email: string, password: string) => Promise<UsuarioPerfil>
  logout: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  updateEmail: (currentPassword: string, newEmail: string) => Promise<void>
  tenants: UserTenant[]
  activeTenantId: string | null
  changeTenant: (tenantId: string) => void
  refreshTenants: () => Promise<void>
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

  const [tenants, setTenants] = useState<UserTenant[]>([])
  const [activeTenantId, setActiveTenantId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("activeTenantId")
    }
    return null
  })

  const refreshTenants = async () => {
    try {
      const data = await carregarTenants()
      setTenants(data)
      
      const currentActive = localStorage.getItem("activeTenantId")
      if (data.length > 0) {
        const stillExists = data.some((t) => t.tenantId === currentActive)
        if (!currentActive || !stillExists) {
          localStorage.setItem("activeTenantId", data[0].tenantId)
          setActiveTenantId(data[0].tenantId)
        }
      } else {
        localStorage.removeItem("activeTenantId")
        setActiveTenantId(null)
      }
    } catch (e) {
      console.error("[Auth Context] Erro ao carregar restaurantes:", e)
    }
  }

  const changeTenant = (tenantId: string) => {
    localStorage.setItem("activeTenantId", tenantId)
    setActiveTenantId(tenantId)
    queryClient.resetQueries()
    queryClient.invalidateQueries({ queryKey: ["auth-profile"] })
  }

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
        setTenants([])
        setActiveTenantId(null)
        if (typeof window !== "undefined") {
          localStorage.removeItem("activeTenantId")
        }
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

  const isAlterarSenhaPage = typeof window !== "undefined" && window.location.pathname.includes("/alterar-senha")

  // O React Query gerencia o cache e o ciclo de vida dos dados do usuário
  const { 
    data: userProfile = null, 
    isLoading: isQueryLoading,
    isError
  } = useQuery({
    queryKey: ["auth-profile"],
    queryFn: carregarPerfilAtual,
    enabled: hasToken && !isInitializing && !isAlterarSenhaPage,
    retry: false,
    staleTime: 1000 * 30, // 30 segundos de cache para sincronizar status de cobrança rapidamente
  })

  // Carrega a lista de tenants quando o perfil do usuário for retornado
  useEffect(() => {
    if (userProfile && hasToken) {
      refreshTenants()
    }
  }, [userProfile, hasToken])

  // Se a query falhar (ex: token inválido ou usuário inativo no BD), limpamos a sessão
  useEffect(() => {
    if (isError) {
      clearStoredAccessToken()
      setHasToken(false)
      setTenants([])
      setActiveTenantId(null)
      if (typeof window !== "undefined") {
        localStorage.removeItem("activeTenantId")
      }
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

      // Carrega os tenants imediatamente sem silenciar erros
      const dataTenants = await carregarTenants()
      setTenants(dataTenants)

      const currentActive = localStorage.getItem("activeTenantId")
      if (dataTenants.length > 0) {
        const stillExists = dataTenants.some((t) => t.tenantId === currentActive)
        if (!currentActive || !stillExists) {
          localStorage.setItem("activeTenantId", dataTenants[0].tenantId)
          setActiveTenantId(dataTenants[0].tenantId)
        }
      } else {
        localStorage.removeItem("activeTenantId")
        setActiveTenantId(null)
      }

      return perfil
    } catch (err) {
      clearStoredAccessToken()
      setHasToken(false)
      setTenants([])
      setActiveTenantId(null)
      if (typeof window !== "undefined") {
        localStorage.removeItem("activeTenantId")
      }
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
      setTenants([])
      setActiveTenantId(null)
      if (typeof window !== "undefined") {
        localStorage.removeItem("activeTenantId")
      }
      queryClient.removeQueries({ queryKey: ["auth-profile"] })
      router.push(routes.auth.login)
    }
  }

  const sendPasswordReset = async (email: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/alterar-senha`,
    })

    if (error) {
      throw mapAuthError(error)
    }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      throw mapAuthError(error)
    }
  }

  const updateEmail = async (currentPassword: string, newEmail: string) => {
    if (!userProfile?.email) {
      throw new Error("E-mail do usuário não identificado.")
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userProfile.email,
      password: currentPassword,
    })

    if (signInError) {
      throw new Error("A senha atual informada está incorreta.")
    }

    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const { error: updateError } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: `${origin}/auth/callback?next=/admin/dashboard` }
    )
    if (updateError) {
      throw mapAuthError(updateError)
    }
  }

  const loading = isInitializing || (hasToken && isQueryLoading)

  return (
    <AuthContext.Provider value={{ user: userProfile, loading, login, logout, sendPasswordReset, updatePassword, updateEmail, tenants, activeTenantId, changeTenant, refreshTenants }}>
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
