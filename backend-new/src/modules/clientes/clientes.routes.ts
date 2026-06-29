import { FastifyInstance } from "fastify";
import { clientesController } from "./clientes.controller.js";
import { requireAuth } from "../../shared/security/require-auth.js";
import { requireRole } from "../../shared/security/require-role.js";

export async function clientesRoutes(app: FastifyInstance) {
  // Todas as rotas de clientes requerem autenticação
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireRole(["admin", "operador", "novato"]));

  app.get("/", clientesController.listar);
  app.post("/", clientesController.cadastrar);
  app.get("/:document/saldo", clientesController.saldo);
  app.get("/documento/:document", clientesController.buscarPorCpf);
}
