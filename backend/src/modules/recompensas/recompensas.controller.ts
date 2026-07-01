import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { recompensasService } from "./recompensas.service.js";
import { successResponse } from "../../shared/http/response.js";

const criarRecompensaSchema = z.object({
  name: z.string().min(2),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  pointsCost: z.coerce.number().positive(),
  isActive: z.boolean().optional(),
});

const atualizarRecompensaSchema = criarRecompensaSchema.partial();

export class RecompensasController {
  async listar(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = request.user!.tenantId;
    const recompensas = await recompensasService.listarRecompensas(tenantId);
    return successResponse(recompensas);
  }

  async criar(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = request.user!.tenantId;
    const body = criarRecompensaSchema.parse(request.body);
    
    const recompensa = await recompensasService.criarRecompensa({
      ...body,
      tenantId,
    });

    return reply.status(201).send(successResponse(recompensa, "Recompensa criada com sucesso."));
  }

  async atualizar(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const tenantId = request.user!.tenantId;
    const id = parseInt(request.params.id, 10);
    const body = atualizarRecompensaSchema.parse(request.body);

    const recompensa = await recompensasService.atualizarRecompensa(tenantId, { ...body, id });

    return successResponse(recompensa, "Recompensa atualizada com sucesso.");
  }

  async excluir(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const tenantId = request.user!.tenantId;
      const id = parseInt(request.params.id, 10);

      await recompensasService.excluirRecompensa(tenantId, id);

      return successResponse(null, "Recompensa arquivada com sucesso.");
    } catch (err) {
      request.log.error(err, "Erro ao excluir recompensa no controller");
      throw err;
    }
  }
}

export const recompensasController = new RecompensasController();
