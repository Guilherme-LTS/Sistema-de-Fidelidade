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
  max: 100,
  timeWindow: "1 minute",
});

// Handler global de erros
setupErrorHandler(app);

import { authRoutes } from "./modules/auth/auth.routes.js";
import { clientesRoutes } from "./modules/clientes/clientes.routes.js";

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
