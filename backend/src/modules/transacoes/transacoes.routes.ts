import { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/security/require-auth.js";
import { transacoesController } from "./transacoes.controller.js";
import { requireRole } from "../../shared/security/require-role.js";

export async function transacoesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.post("/", { preHandler: [requireRole(["admin", "operador"])] }, transacoesController.lancarPontos);
}
