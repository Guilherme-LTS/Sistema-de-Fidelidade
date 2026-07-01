import { createClient } from "@supabase/supabase-js"
import { clientEnv } from "@/config/env.client"

const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co"
const supabasePublishableKey = clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder-anon-key"

if (!clientEnv.NEXT_PUBLIC_SUPABASE_URL || !clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  if (typeof window !== "undefined") {
    console.warn("AVISO: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY não estão definidas.")
  }
}

// 1. Cliente para Lojistas/Admin - Usa persistência padrão no localStorage
export const supabaseAdminClient = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    storageKey: "supabase-admin-session",
    detectSessionInUrl: true,
    flowType: "pkce",
  }
})

// 2. Cliente para Consumidores - Usa persistência própria para não colidir
export const supabaseConsumerClient = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    storageKey: "supabase-consumer-session",
    detectSessionInUrl: false,
    flowType: "pkce",
  }
})
