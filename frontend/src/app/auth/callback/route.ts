import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

/**
 * Sanitiza o parâmetro `next` para impedir ataques de Open Redirect
 * (ex: `next=//evil.com`, `next=@evil.com`, `next=https://evil.com`).
 * Permite apenas caminhos relativos internos iniciados por uma única barra `/`.
 */
function sanitizeRedirectPath(rawNext: string | null, origin: string): string {
  const fallback = "/admin/dashboard"
  if (!rawNext) return fallback

  const trimmed = rawNext.trim()
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    /[\r\n\0]/.test(trimmed)
  ) {
    return fallback
  }

  try {
    const resolved = new URL(trimmed, origin)
    if (resolved.origin !== origin) {
      return fallback
    }
    return `${resolved.pathname}${resolved.search}${resolved.hash}`
  } catch {
    return fallback
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = sanitizeRedirectPath(searchParams.get("next"), origin)
  const message = searchParams.get("message")

  const isConsumer = next.startsWith("/acesso") || next.startsWith("/fidelidade") || next.startsWith("/painel")

  // Trata o primeiro clique na confirmação dupla de e-mail
  if (message) {
    const redirectPath = isConsumer ? "/acesso" : "/login"
    return NextResponse.redirect(`${origin}${redirectPath}?info=first_confirmation&msg=${encodeURIComponent(message)}`)
  }

  if (code) {
    const cookieStore = await cookies()
    
    // Determina o cookie correto com base no destino do redirecionamento
    const cookieName = isConsumer ? "sb-consumer-session" : "sb-admin-session"

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignorar se for chamado de Server Components
            }
          },
        },
        cookieOptions: {
          name: cookieName,
        }
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    
    console.error("[Auth Server Callback] Erro na troca de código:", error)
    
    const isPkceError = error.message?.includes("PKCE") || error.name === "AuthPKCECodeVerifierMissingError"
    if (isPkceError) {
      if (next.startsWith("/alterar-senha")) {
        return NextResponse.redirect(`${origin}/login?error=pkce_recovery`)
      }
      return NextResponse.redirect(`${origin}${next.startsWith("/convites") ? next : "/login?verified=true"}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=unknown`)
}
