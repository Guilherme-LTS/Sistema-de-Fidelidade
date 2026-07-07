import { createBrowserClient } from "@supabase/ssr"
import { clientEnv } from "@/config/env.client"

const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co"
const supabasePublishableKey = clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder-anon-key"

if (!clientEnv.NEXT_PUBLIC_SUPABASE_URL || !clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  if (typeof window !== "undefined") {
    console.warn("AVISO: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY não estão definidas.")
  }
}

// 1. Cliente para Lojistas/Admin - Usa Cookies específicos para Lojistas
export const supabaseAdminClient = createBrowserClient(supabaseUrl, supabasePublishableKey, {
  cookieOptions: {
    name: "sb-admin-session",
  }
})

// 2. Cliente para Consumidores - Usa Cookies específicos para Consumidores para não colidir
export const supabaseConsumerClient = createBrowserClient(supabaseUrl, supabasePublishableKey, {
  cookieOptions: {
    name: "sb-consumer-session",
  }
})
