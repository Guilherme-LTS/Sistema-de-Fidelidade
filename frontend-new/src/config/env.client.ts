import { z } from "zod"

const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:3001"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_PUBLIC_TENANT_ID: z.string().optional(),
  NEXT_PUBLIC_PUBLIC_TENANT_SLUG: z.string().optional(),
})

export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_PUBLIC_TENANT_ID: process.env.NEXT_PUBLIC_PUBLIC_TENANT_ID,
  NEXT_PUBLIC_PUBLIC_TENANT_SLUG: process.env.NEXT_PUBLIC_PUBLIC_TENANT_SLUG,
})
