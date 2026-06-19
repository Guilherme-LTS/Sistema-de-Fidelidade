import { FastifyInstance } from "fastify";
import { clientesController } from "./clientes.controller.js";
import { requireAuth } from "../../shared/security/require-auth.js";

export async function clientesRoutes(app: FastifyInstance) {
  // Todas as rotas de clientes requerem autenticação
  app.addHook("preHandler", requireAuth);

  app.get("/", clientesController.listar);
  app.post("/", clientesController.cadastrar);
  app.get("/:document/saldo", clientesController.saldo);
}
