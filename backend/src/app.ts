import fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { corsConfig } from "./config/cors.js";
import { setupErrorHandler } from "./shared/errors/error-handler.js";
import { successResponse } from "./shared/http/response.js";

export const app = fastify({
  logger: false, // Usamos nosso logger customizado infra/logger para controle total
});

// Registrar segurança básica (CORS, Helmet e Rate Limit)
await app.register(helmet, { global: true });
await app.register(cors, corsConfig);
await app.register(rateLimit, {
  timeWindow: "1 minute",
  max: (req, key) => {
    // Se a chave for identificada por tenant ou token autenticado, permite 300 req/min (suporta múltiplos caixas em um mesmo restaurante/IP)
    if (key.startsWith("tenant:") || key.startsWith("auth:")) {
      return 300;
    }
    return 100; // Limite para acessos anônimos por IP
  },
  keyGenerator: (req) => {
    const tenantId = req.headers["x-tenant-id"] as string | undefined;
    const authHeader = req.headers.authorization;

    if (tenantId) {
      return `tenant:${tenantId}:${req.ip}`;
    }
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return `auth:${authHeader.slice(-16)}:${req.ip}`;
    }
    return req.ip;
  },
  allowList: (req) => {
    // Excluir Webhooks (Stripe / Cron) e Healthcheck do rate limit global para evitar bloqueio de eventos da Stripe e monitoramento
    const url = req.url;
    return (
      url === "/health" ||
      url.startsWith("/billing/webhook") ||
      url.startsWith("/webhooks/")
    );
  },
  errorResponseBuilder: (_req, context) => {
    return {
      error: {
        code: "TOO_MANY_REQUESTS",
        message: `Muitas requisições enviadas. Limite de ${context.max} requisições por minuto excedido. Tente novamente em ${context.after}.`,
      },
    };
  },
});

// Handler global de erros
setupErrorHandler(app);

import { authRoutes } from "./modules/auth/auth.routes.js";
import { clientesRoutes } from "./modules/clientes/clientes.routes.js";
import { transacoesRoutes } from "./modules/transacoes/transacoes.routes.js";
import { recompensasRoutes } from "./modules/recompensas/recompensas.routes.js";
import { resgatesRoutes } from "./modules/resgates/resgates.routes.js";
import { configuracoesRoutes } from "./modules/configuracoes/configuracoes.routes.js";
import { auditoriaRoutes } from "./modules/auditoria/auditoria.routes.js";
import { usuariosRoutes } from "./modules/usuarios/usuarios.routes.js";
import { publicRoutes } from "./modules/public/public.routes.js";
import { consumerRoutes } from "./modules/consumer/consumer.routes.js";
import { cronRoutes } from "./modules/cron/cron.routes.js";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes.js";
import { billingRoutes } from "./modules/billing/billing.routes.js";

// Rota de Health Check (/health)
app.get("/health", async (_request, _reply) => {
  return successResponse({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV || "development",
  });
});

// Registra as rotas da aplicação
app.register(authRoutes, { prefix: "/auth" });
app.register(clientesRoutes, { prefix: "/clientes" });
app.register(transacoesRoutes, { prefix: "/transacoes" });
app.register(recompensasRoutes, { prefix: "/recompensas" });
app.register(resgatesRoutes, { prefix: "/resgates" });
app.register(configuracoesRoutes, { prefix: "/configuracoes" });
app.register(auditoriaRoutes, { prefix: "/auditoria" });
app.register(usuariosRoutes, { prefix: "/usuarios" });
app.register(publicRoutes, { prefix: "/public" });
app.register(consumerRoutes, { prefix: "/consumer" });
app.register(cronRoutes, { prefix: "/webhooks/cron" });
app.register(dashboardRoutes, { prefix: "/dashboard" });
app.register(billingRoutes, { prefix: "/billing" });
