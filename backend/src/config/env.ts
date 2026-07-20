import "dotenv/config";
import { z } from "zod";

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

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", JSON.stringify(_env.error.format(), null, 2));
  process.exit(1);
}

export const env = _env.data;
export type Env = z.infer<typeof envSchema>;
