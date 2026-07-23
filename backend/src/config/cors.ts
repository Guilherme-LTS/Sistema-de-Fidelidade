import { env } from "./env.js";

export const corsConfig = {
  origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
    // Permitir requisições sem origin (ex: mobile apps, Curl, Postman, chamadas server-to-server)
    if (!origin) {
      return cb(null, true);
    }

    // 1. Verificar se a origem está explicitamente configurada em ALLOWED_ORIGINS
    if (env.ALLOWED_ORIGINS.includes(origin) || env.ALLOWED_ORIGINS.includes("*")) {
      return cb(null, true);
    }

    // 2. Permitir subdomínios oficiais da plataforma SaaS
    if (
      origin.endsWith(".usepontus.com.br") ||
      origin === "https://usepontus.com.br" ||
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:") ||
      origin.startsWith("http://app.localhost:")
    ) {
      return cb(null, true);
    }

    return cb(new Error("Acesso bloqueado pela política de CORS"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-ID"],
};

