import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { configuracoesService } from "./configuracoes.service.js";
import { successResponse } from "../../shared/http/response.js";
import { safeHttpUrlSchema } from "../../shared/validators/url.js";

const restauranteSchema = z.object({
  name: z.string().min(1).max(200),
  tradingName: z.string().max(200).optional(),
  document: z.string().max(30).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal("")),
  addressLine1: z.string().max(255).optional(),
  addressNumber: z.string().max(30).optional(),
  addressCity: z.string().max(120).optional(),
  addressState: z.string().length(2).optional().or(z.literal("")),
  latitude: z.union([z.string(), z.number()]).optional(),
  longitude: z.union([z.string(), z.number()]).optional(),
  logoUrl: safeHttpUrlSchema.nullable().optional(),
  businessHours: z.record(z.string(), z.object({
    active: z.boolean(),
    open: z.string(),
    close: z.string(),
  })).optional(),
  socialLinks: z.object({
    instagram: safeHttpUrlSchema.nullable().optional(),
    facebook: safeHttpUrlSchema.nullable().optional(),
    tiktok: safeHttpUrlSchema.nullable().optional(),
    website: safeHttpUrlSchema.nullable().optional(),
  }).nullable().optional(),
});

const fidelidadeSchema = z.object({
  carenciaPontos: z.number().min(0),
  expiracaoPontos: z.number().min(0),
  pointsConversionReal: z.number().positive("O valor de conversão deve ser maior que zero."),
  regulationNotes: z.string().optional().or(z.literal("")),
  pointName: z.string().max(50, "O nome dos pontos deve ter no máximo 50 caracteres.").optional().or(z.literal("")).nullable(),
});

export class ConfiguracoesController {
  async getRestaurante(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = request.user!.tenantId;
    const data = await configuracoesService.getRestaurante(tenantId);
    return successResponse(data);
  }

  async updateRestaurante(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = request.user!.tenantId;
    const body = restauranteSchema.parse(request.body);
    const data = await configuracoesService.updateRestaurante(tenantId, body, request.user!.authUserId, request.ip);
    return successResponse(data, "Perfil do estabelecimento atualizado com sucesso.");
  }

  async getFidelidade(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = request.user!.tenantId;
    const data = await configuracoesService.getFidelidade(tenantId);
    return successResponse(data);
  }

  async updateFidelidade(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = request.user!.tenantId;
    const body = fidelidadeSchema.parse(request.body);
    const data = await configuracoesService.updateFidelidade(tenantId, body, request.user!.authUserId, request.ip);
    return successResponse(data, "Regras do programa atualizadas com sucesso.");
  }
}

export const configuracoesController = new ConfiguracoesController();
