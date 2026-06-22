import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { auditoriaService } from "./auditoria.service.js";
import { successResponse } from "../../shared/http/response.js";

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  action: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  q: z.string().optional(),
});

export class AuditoriaController {
  async listLogs(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = request.user!.tenantId;
    const query = listQuerySchema.parse(request.query);
    
    const data = await auditoriaService.listLogs(tenantId, query);
    
    return reply.send({
      success: true,
      data: data.data,
      metadata: data.metadata,
    });
  }
}

export const auditoriaController = new AuditoriaController();
