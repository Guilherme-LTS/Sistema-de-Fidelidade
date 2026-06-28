import { FastifyInstance } from "fastify";
import { DashboardController } from "./dashboard.controller.js";
import { DashboardService } from "./dashboard.service.js";
import { requireAuth } from "../../shared/security/require-auth.js";
import { requireRole } from "../../shared/security/require-role.js";

export async function dashboardRoutes(fastify: FastifyInstance) {
  const dashboardService = new DashboardService();
  const dashboardController = new DashboardController(dashboardService);

  fastify.addHook("preHandler", requireAuth);
  fastify.addHook("preHandler", requireRole(["admin", "operador"]));

  fastify.get(
    "/stats",
    {
      schema: {
        summary: "Estatísticas do Dashboard",
        tags: ["Dashboard"],
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  clientes: {
                    type: "object",
                    properties: {
                      total: { type: "number" },
                      novosMes: { type: "number" }
                    }
                  },
                  pontos: {
                    type: "object",
                    properties: {
                      emitidos: { type: "number" },
                      resgatados: { type: "number" },
                      expirados: { type: "number" },
                      saldoCirculante: { type: "number" }
                    }
                  },
                  recompensas: {
                    type: "object",
                    properties: {
                      favorita: { type: ["string", "null"] },
                      resgatesMes: { type: "number" }
                    }
                  },
                  topClientes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        nome: { type: "string" },
                        saldo: { type: "number" }
                      }
                    }
                  },
                  atividades: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        action: { type: "string" },
                        createdAt: { type: ["string", "null"] },
                        metadata: { type: ["string", "null"] }
                      }
                    }
                  },
                  chartData: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string" },
                        emitidos: { type: "number" },
                        resgatados: { type: "number" },
                        expirados: { type: "number" }
                      }
                    }
                  }
                }
              }
            },
          },
        },
      },
    },
    dashboardController.getStats.bind(dashboardController)
  );
}
