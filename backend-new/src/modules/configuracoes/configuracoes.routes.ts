import { FastifyInstance } from "fastify";
import { configuracoesController } from "./configuracoes.controller.js";
import { requireAuth } from "../../shared/security/require-auth.js";
import { z } from "zod";

export const updateRestauranteSchema = z.object({
  name: z.string().optional(),
  addressLine1: z.string().optional(),
  addressNumber: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  latitude: z.union([z.string(), z.number()]).optional(),
  longitude: z.union([z.string(), z.number()]).optional(),
  logoUrl: z.string().optional(),
});

export async function configuracoesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/restaurante", (req, rep) => configuracoesController.getRestaurante(req, rep));
  app.put("/restaurante", (req, rep) => configuracoesController.updateRestaurante(req, rep));

  app.get("/usuario", (req, rep) => configuracoesController.getUsuario(req, rep));
  app.put("/usuario", (req, rep) => configuracoesController.updateUsuario(req, rep));

  app.get("/fidelidade", (req, rep) => configuracoesController.getFidelidade(req, rep));
  app.put("/fidelidade", (req, rep) => configuracoesController.updateFidelidade(req, rep));
}
