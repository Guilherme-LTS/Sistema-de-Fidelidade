import { FastifyInstance } from "fastify";
import { recompensasController } from "./recompensas.controller.js";
import { requireAuth } from "../../shared/security/require-auth.js";
import { requireRole } from "../../shared/security/require-role.js";

export async function recompensasRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/", { preHandler: [requireRole(["admin", "operador", "novato"])] }, (req, rep) => recompensasController.listar(req, rep));
  app.post("/", { preHandler: [requireRole(["admin"])] }, (req, rep) => recompensasController.criar(req, rep));
  app.put<{ Params: { id: string } }>("/:id", { preHandler: [requireRole(["admin"])] }, (req, rep) => recompensasController.atualizar(req, rep));
  app.delete<{ Params: { id: string } }>("/:id", { preHandler: [requireRole(["admin"])] }, (req, rep) => recompensasController.excluir(req, rep));
}
