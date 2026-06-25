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
import { transacoesRoutes } from "./modules/transacoes/transacoes.routes.js";
import { recompensasRoutes } from "./modules/recompensas/recompensas.routes.js";
import { resgatesRoutes } from "./modules/resgates/resgates.routes.js";
import { configuracoesRoutes } from "./modules/configuracoes/configuracoes.routes.js";
import { auditoriaRoutes } from "./modules/auditoria/auditoria.routes.js";
import { usuariosRoutes } from "./modules/usuarios/usuarios.routes.js";
import { publicRoutes } from "./modules/public/public.routes.js";
import { consumerRoutes } from "./modules/consumer/consumer.routes.js";

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
