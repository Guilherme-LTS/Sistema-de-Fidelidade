import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { recompensasService } from "./recompensas.service.js";
import { successResponse } from "../../shared/http/response.js";
import { AppError } from "../../shared/errors/app-error.js";
import { safeHttpUrlSchema } from "../../shared/validators/url.js";

const criarRecompensaSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).nullable().optional(),
  imageUrl: safeHttpUrlSchema.nullable().optional(),
  pointsCost: z.coerce.number().int().positive(),
  isActive: z.boolean().optional(),
});

const atualizarRecompensaSchema = criarRecompensaSchema.partial();

function parsePositiveIntId(rawId: string): number {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("ID de recompensa inválido.", 400);
  }
  return id;
}

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
    const id = parsePositiveIntId(request.params.id);
    const body = atualizarRecompensaSchema.parse(request.body);

    const recompensa = await recompensasService.atualizarRecompensa(tenantId, { ...body, id });

    return successResponse(recompensa, "Recompensa atualizada com sucesso.");
  }

  async excluir(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const tenantId = request.user!.tenantId;
      const id = parsePositiveIntId(request.params.id);

      await recompensasService.excluirRecompensa(tenantId, id);

      return successResponse(null, "Recompensa arquivada com sucesso.");
    } catch (err) {
      request.log.error(err, "Erro ao excluir recompensa no controller");
      throw err;
    }
  }
}

export const recompensasController = new RecompensasController();
