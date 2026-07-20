import "dotenv/config";
import { z } from "zod";

// Baseline schema for environment variables
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4001),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z.string().url().or(z.string().min(1)),
  APP_DATABASE_URL: z.string().url().or(z.string().min(1)),
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(10),
  SUPABASE_SECRET_KEY: z.string().min(10),
  ALLOWED_ORIGINS: z.string().transform((val) => val.split(",").map((s) => s.trim())),
  FRONTEND_URL: z.string().url(),
  RESEND_API_KEY: z.string().startsWith("re_"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO_MENSAL: z.string().optional(),
  STRIPE_PRICE_PRO_ANUAL: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === "production") {
    if (!data.STRIPE_SECRET_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "STRIPE_SECRET_KEY é obrigatória em produção.",
        path: ["STRIPE_SECRET_KEY"],
      });
    }
    if (!data.STRIPE_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "STRIPE_WEBHOOK_SECRET é obrigatória em produção.",
        path: ["STRIPE_WEBHOOK_SECRET"],
      });
    }
  }
});

export type Env = z.infer<typeof envSchema>;

// Default safe fallback values for automated test environments (CI / Vitest)
const testFallbacks: Partial<Record<keyof Env, any>> = {
  NODE_ENV: "test",
  PORT: 4001,
  LOG_LEVEL: "error",
  DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/test_db",
  APP_DATABASE_URL: process.env.APP_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/test_db",
  SUPABASE_URL: process.env.SUPABASE_URL || "https://test-project.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_test_publishable_key",
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_test_secret_key",
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",").map(s => s.trim()) : ["http://localhost:3000"],
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  RESEND_API_KEY: process.env.RESEND_API_KEY || "re_test_key_12345",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "sk_test_dummy_key_for_ci",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "whsec_dummy_secret_for_ci",
};

/**
 * Validates environment variables and returns a typed Env configuration object.
 * Does NOT invoke process.exit(1) directly in module scope.
 */
export function validateEnv(): Env {
  const isTest = process.env.NODE_ENV === "test";
  const sourceEnv = isTest ? { ...testFallbacks, ...process.env } : process.env;

  const parseResult = envSchema.safeParse(sourceEnv);

  if (!parseResult.success) {
    const errorDetails = JSON.stringify(parseResult.error.format(), null, 2);
    console.error("❌ Invalid environment variables configuration:\n", errorDetails);
    throw new Error(`Invalid environment variables configuration:\n${errorDetails}`);
  }

  return parseResult.data;
}

// Module-level safe initialization (lazy/fallback aware)
let _envInstance: Env;

try {
  _envInstance = validateEnv();
} catch (err) {
  if (process.env.NODE_ENV === "test") {
    _envInstance = testFallbacks as Env;
  } else {
    // Re-throw so boot or import error is logged cleanly without raw process.exit in module scope
    throw err;
  }
}

export const env = _envInstance;
