import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { resgatesService } from "./resgates.service.js";
import { successResponse } from "../../shared/http/response.js";

const resgatarPremioSchema = z.object({
  document: z.string().min(11),
  rewardId: z.coerce.number().positive(),
});

export class ResgatesController {
  async resgatar(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = request.user!.tenantId;
    
    const body = resgatarPremioSchema.parse(request.body);
    
    const resultado = await resgatesService.resgatarPremio({
      tenantId,
      operatorId: request.user!.tenantUserId,
      authUserId: request.user!.authUserId,
      document: body.document,
      rewardId: body.rewardId,
      ipAddress: request.ip,
    });

    return reply.status(201).send(successResponse(resultado, "Resgate realizado com sucesso."));
  }
}

export const resgatesController = new ResgatesController();
