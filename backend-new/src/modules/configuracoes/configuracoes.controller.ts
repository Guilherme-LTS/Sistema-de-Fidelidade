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
});

const usuarioSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
});

const fidelidadeSchema = z.object({
  carenciaPontos: z.number().min(0),
  expiracaoPontos: z.number().min(0),
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
    const data = await configuracoesService.updateRestaurante(tenantId, body);
    return successResponse(data, "Perfil do restaurante atualizado com sucesso.");
  }

  async getUsuario(request: FastifyRequest, reply: FastifyReply) {
    const tenantUserId = request.user!.tenantUserId;
    const data = await configuracoesService.getUsuario(tenantUserId);
    // Para simplificar no front, vamos incluir o email do Auth
    return successResponse({ ...data, email: request.user!.email });
  }

  async updateUsuario(request: FastifyRequest, reply: FastifyReply) {
    const tenantUserId = request.user!.tenantUserId;
    const body = usuarioSchema.parse(request.body);
    const data = await configuracoesService.updateUsuario(tenantUserId, body);
    return successResponse({ ...data, email: request.user!.email }, "Perfil de usuário atualizado com sucesso.");
  }

  async getFidelidade(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = request.user!.tenantId;
    const data = await configuracoesService.getFidelidade(tenantId);
    return successResponse(data);
  }

  async updateFidelidade(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = request.user!.tenantId;
    const body = fidelidadeSchema.parse(request.body);
    const data = await configuracoesService.updateFidelidade(tenantId, body);
    return successResponse(data, "Regras do programa atualizadas com sucesso.");
  }
}

export const configuracoesController = new ConfiguracoesController();
