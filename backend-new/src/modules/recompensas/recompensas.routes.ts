import { FastifyInstance } from "fastify";
import { recompensasController } from "./recompensas.controller.js";
import { requireAuth } from "../../shared/security/require-auth.js";

export async function recompensasRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/", (req, rep) => recompensasController.listar(req, rep));
  app.post("/", (req, rep) => recompensasController.criar(req, rep));
  app.put("/:id", (req, rep) => recompensasController.atualizar(req, rep));
  app.delete("/:id", (req, rep) => recompensasController.excluir(req, rep));
}
