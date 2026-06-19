import { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/security/require-auth.js";
import { transacoesController } from "./transacoes.controller.js";

export async function transacoesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.post("/", transacoesController.lancarPontos);
}
