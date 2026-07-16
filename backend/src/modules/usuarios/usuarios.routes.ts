import { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/security/require-auth.js";
import { requireRole } from "../../shared/security/require-role.js";
import { requireSubscription } from "../../shared/security/require-subscription.js";
import { usuariosController } from "./usuarios.controller.js";

export async function usuariosRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireSubscription);
  app.addHook("preHandler", requireRole(["admin"]));

  app.get("/", (req, rep) => usuariosController.listar(req, rep));
  app.post("/", (req, rep) => usuariosController.criar(req, rep));
  app.put<{ Params: { id: string } }>("/:id", (req, rep) => usuariosController.atualizar(req, rep));
  app.patch<{ Params: { id: string } }>("/:id/status", (req, rep) => usuariosController.alterarStatus(req, rep));
  app.delete<{ Params: { id: string } }>("/:id", (req, rep) => usuariosController.excluir(req, rep));
}
