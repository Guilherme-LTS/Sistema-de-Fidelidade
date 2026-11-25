import { env } from "./env.js";

function isAllowedOrigin(origin: string): boolean {
  // 1. Verificar se a origem está explicitamente configurada em ALLOWED_ORIGINS
  if (env.ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  // Wildcard só é aceito fora de produção
  if (env.NODE_ENV !== "production" && env.ALLOWED_ORIGINS.includes("*")) {
    return true;
  }

  // 2. Parse seguro da URL para evitar bypasses de startsWith/endsWith (ex: http://evil.com?.usepontus.com.br)
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  // Subdomínios oficiais da plataforma exigem HTTPS
  if (
    parsed.protocol === "https:" &&
    (parsed.hostname === "usepontus.com.br" || parsed.hostname.endsWith(".usepontus.com.br"))
  ) {
    return true;
  }

  // Origens locais permitidas apenas em development/test
  if (
    env.NODE_ENV !== "production" &&
    parsed.protocol === "http:" &&
    (parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "app.localhost")
  ) {
    return true;
  }

  return false;
}

export const corsConfig = {
  origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
    // Permitir requisições sem origin (ex: webhooks, curl, chamadas server-to-server)
    if (!origin) {
      return cb(null, true);
    }

    if (isAllowedOrigin(origin)) {
      return cb(null, true);
    }

    return cb(new Error("Acesso bloqueado pela política de CORS"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-ID"],
};
