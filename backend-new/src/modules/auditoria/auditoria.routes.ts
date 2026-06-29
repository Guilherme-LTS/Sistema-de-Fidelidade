import { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/security/require-auth.js";
import { auditoriaController } from "./auditoria.controller.js";
import { requireRole } from "../../shared/security/require-role.js";

export async function auditoriaRoutes(app: FastifyInstance) {
  // O middleware requireAuth será exigido em todas as rotas de auditoria
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireRole(["admin"]));

  app.get("/", auditoriaController.listLogs.bind(auditoriaController));
}
