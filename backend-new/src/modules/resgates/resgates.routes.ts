import { FastifyInstance } from "fastify";
import { resgatesController } from "./resgates.controller.js";
import { requireAuth } from "../../shared/security/require-auth.js";
import { requireRole } from "../../shared/security/require-role.js";

export async function resgatesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.post("/", { preHandler: [requireRole(["admin", "operador", "novato"])] }, resgatesController.resgatar);
}
