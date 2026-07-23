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
  businessHours: z.record(z.string(), z.object({
    active: z.boolean(),
    open: z.string(),
    close: z.string()
  })).optional(),
});
import { requireRole } from "../../shared/security/require-role.js";

export async function configuracoesRoutes(app: FastifyInstance) {
  // requireAuth é necessário — operações de configuração devem ser autenticadas.
  app.addHook("preHandler", requireAuth);

  // ⚠️  requireSubscription está INTENCIONALMENTE ausente aqui.
  // Restaurantes inadimplentes ou com trial vencido PRECISAM conseguir acessar
  // as configurações (nome, logo, horários, etc.) para resolver pendências administrativas.
  // Bloquear configurações criaria um lock-out sem saída para o usuário:
  // ele não consegue atualizar dados de contato para receber ajuda, nem corrigir problemas
  // que o suporte pediria. O risco de permitir leitura/edição de configurações sem assinatura
  // ativa é irrelevante — configurações não afetam débitos de pontos nem billing Stripe.


  app.get("/restaurante", (req, rep) => configuracoesController.getRestaurante(req, rep));
  app.put(
    "/restaurante",
    { preHandler: [requireRole(["admin"])] },
    (req, rep) => configuracoesController.updateRestaurante(req, rep)
  );

  app.get("/fidelidade", (req, rep) => configuracoesController.getFidelidade(req, rep));
  app.put(
    "/fidelidade",
    { preHandler: [requireRole(["admin"])] },
    (req, rep) => configuracoesController.updateFidelidade(req, rep)
  );
}
