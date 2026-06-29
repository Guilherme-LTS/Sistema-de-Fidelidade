import { FastifyInstance } from "fastify";
import { cronController } from "./cron.controller.js";

export async function cronRoutes(app: FastifyInstance) {
  // Webhook for processing expirations. Protected by CRON_SECRET header inside the controller.
  app.post("/expire", (req, rep) => cronController.processExpirations(req, rep));
}
