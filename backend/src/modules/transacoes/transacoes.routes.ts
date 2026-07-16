import { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/security/require-auth.js";
import { transacoesController } from "./transacoes.controller.js";
import { requireRole } from "../../shared/security/require-role.js";
import { requireSubscription } from "../../shared/security/require-subscription.js";

export async function transacoesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireSubscription);

  app.post("/", { preHandler: [requireRole(["admin", "operador"])] }, transacoesController.lancarPontos);
}
