import { FastifyReply, FastifyRequest } from "fastify";
import { DashboardService } from "./dashboard.service.js";
import { successResponse, errorResponse } from "../../shared/http/response.js";

export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  async getStats(
    request: FastifyRequest<{ Querystring: { period?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { user } = request as any;

      if (!user || !user.tenantId) {
        return reply.status(401).send(errorResponse("Não autorizado", "UNAUTHORIZED"));
      }

      let periodDays = 30;
      if (request.query.period) {
        const parsed = parseInt(request.query.period, 10);
        if ([7, 30, 90].includes(parsed)) {
          periodDays = parsed;
        }
      }

      const stats = await this.dashboardService.getDashboardStats(user.tenantId, periodDays);
      
      return successResponse(stats);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send(errorResponse("Erro interno ao buscar estatísticas do dashboard", "INTERNAL_ERROR", error.message));
    }
  }
}
