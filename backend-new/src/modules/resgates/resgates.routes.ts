import { FastifyInstance } from "fastify";
import { resgatesController } from "./resgates.controller.js";
import { requireAuth } from "../../shared/security/require-auth.js";

export async function resgatesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.post("/", resgatesController.resgatar);
}
