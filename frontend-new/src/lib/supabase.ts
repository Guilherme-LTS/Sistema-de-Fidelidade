import { createClient } from "@supabase/supabase-js"
import { clientEnv } from "@/config/env.client"

const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co"
const supabaseAnonKey = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"

if (!clientEnv.NEXT_PUBLIC_SUPABASE_URL || !clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  // Apenas avisa no cliente no navegador para evitar poluir os logs de build
  if (typeof window !== "undefined") {
    console.warn("AVISO: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não estão definidas no clientEnv.")
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
