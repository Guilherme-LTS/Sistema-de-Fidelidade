import { clientEnv } from "@/config/env.client"
import { getStoredAccessToken } from "@/lib/auth/session"
import { supabase } from "@/lib/supabase"

type RequestOptions = RequestInit & {
  authToken?: string | null
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { authToken, headers, ...requestInit } = options
  
  // Obtém o token mantido atualizado pelo AuthContext
  let token = authToken
  if (token === undefined) {
    token = getStoredAccessToken()
  }

  const headersToUse: HeadersInit = {
    ...(requestInit.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  }

  const response = await fetch(`${clientEnv.NEXT_PUBLIC_API_URL}${path}`, {
    ...requestInit,
    headers: headersToUse,
    cache: "no-store",
  })

  const contentType = response.headers.get("content-type")
  const payload = contentType?.includes("application/json") ? await response.json() : await response.text()

  if (!response.ok) {
    let message = `Erro na API (${response.status})`
    if (typeof payload === "object" && payload) {
      if ("error" in payload) {
        const errorObj = (payload as any).error
        if (typeof errorObj === "object" && errorObj !== null) {
          if (errorObj.message) {
            message = errorObj.message
            // Se for erro de validação e tiver detalhes, formata-os para o usuário
            if (errorObj.code === "VALIDATION_ERROR" && Array.isArray(errorObj.details)) {
              const detailsMsg = errorObj.details
                .map((d: any) => d.message || `${d.path}: ${d.message}`)
                .join(", ")
              if (detailsMsg) {
                message = detailsMsg
              }
            }
          } else {
            message = JSON.stringify(errorObj)
          }
        } else if (typeof errorObj === "string") {
          message = errorObj
        }
      } else if ("message" in payload && typeof (payload as any).message === "string") {
        message = (payload as any).message
      }
    }

    if (response.status === 401 || response.status === 403) {
      if (typeof window !== "undefined") {
        import("@/lib/auth/session").then(({ clearStoredAccessToken }) => {
          clearStoredAccessToken()
        })
        supabase.auth.signOut().then(() => {
          const currentPath = window.location.pathname
          
          if (!currentPath.includes("/login") && !currentPath.includes("/acesso")) {
            // Se estiver no fluxo do consumidor (painel/perfil), redireciona pro acesso do consumidor
            const isConsumerFlow = currentPath.startsWith("/painel") || currentPath.startsWith("/fidelidade") || currentPath.startsWith("/perfil")
            const baseLoginUrl = isConsumerFlow ? "/acesso" : "/login"
            
            const redirectUrl = response.status === 403 
              ? `${baseLoginUrl}?error=${encodeURIComponent(message)}` 
              : `${baseLoginUrl}?expired=true`;
            
            window.location.href = redirectUrl
          }
        })
      }
    }

    throw new ApiError(message, response.status, payload)
  }

  return payload as T
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { method: "GET", ...options }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { method: "DELETE", ...options }),
}

