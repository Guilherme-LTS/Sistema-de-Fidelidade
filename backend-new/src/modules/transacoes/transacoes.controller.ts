import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { transacoesService } from "./transacoes.service.js";
import { successResponse } from "../../shared/http/response.js";

const lancarPontosSchema = z.object({
  document: z.string().min(11),
  valor: z.coerce.number().positive(),
  nome: z.string().optional(),
  lgpdConsentimento: z.boolean().optional(),
});

export class TransacoesController {
  async lancarPontos(request: FastifyRequest, reply: FastifyReply) {
    const body = lancarPontosSchema.parse(request.body);
    const tenantId = request.user!.tenantId;
    // For now, we omit operatorId if the auth layer doesn't map it properly to tenant_users.id.
    // In the future, request.user should contain the operator's ID (tenant_users.id).

    const resultado = await transacoesService.lancarPontos({
      tenantId,
      operatorId: request.user!.tenantUserId,
      authUserId: request.user!.authUserId,
      document: body.document,
      valor: body.valor,
      nome: body.nome,
      lgpdConsentimento: body.lgpdConsentimento,
      ipAddress: request.ip,
    });

    return reply.status(201).send(successResponse(resultado, "Pontos lançados com sucesso."));
  }
}

export const transacoesController = new TransacoesController();
