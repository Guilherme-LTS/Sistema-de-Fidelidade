import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { configuracoesService } from "./configuracoes.service.js";
import { successResponse } from "../../shared/http/response.js";

const restauranteSchema = z.object({
  name: z.string().min(1),
  tradingName: z.string().optional(),
  document: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  addressLine1: z.string().optional(),
  addressNumber: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().length(2).optional().or(z.literal("")),
  latitude: z.union([z.string(), z.number()]).optional(),
  longitude: z.union([z.string(), z.number()]).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  businessHours: z.record(z.string(), z.object({
    active: z.boolean(),
    open: z.string(),
    close: z.string(),
  })).optional(),
  socialLinks: z.object({
    instagram: z.string().optional().or(z.literal("")),
    facebook: z.string().optional().or(z.literal("")),
    tiktok: z.string().optional().or(z.literal("")),
    website: z.string().optional().or(z.literal("")),
  }).optional(),
});

const fidelidadeSchema = z.object({
  carenciaPontos: z.number().min(0),
  expiracaoPontos: z.number().min(0),
  pointsConversionReal: z.number().positive("O valor de conversão deve ser maior que zero."),
  regulationNotes: z.string().optional().or(z.literal("")),
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
    return successResponse(data, "Perfil do restaurante atualizado com sucesso.");
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
