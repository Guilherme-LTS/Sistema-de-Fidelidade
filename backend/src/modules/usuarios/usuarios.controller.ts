import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { usuariosService } from "./usuarios.service.js";
import { successResponse } from "../../shared/http/response.js";

const criarUsuarioSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional().or(z.literal("")),
  role: z.enum(["admin", "operador", "novato"]),
});

const atualizarUsuarioSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
  role: z.enum(["admin", "operador", "novato"]).optional(),
});

const alterarStatusSchema = z.object({
  isActive: z.boolean(),
});

export class UsuariosController {
  async listar(request: FastifyRequest, reply: FastifyReply) {
    const { tenantId } = request.user!;
    const usuarios = await usuariosService.listar(tenantId);
    return reply.send(successResponse(usuarios));
  }

  async criar(request: FastifyRequest, reply: FastifyReply) {
    const { tenantId, tenantUserId } = request.user!;
    const data = criarUsuarioSchema.parse(request.body);
    const novoUsuario = await usuariosService.criar(tenantId, tenantUserId, data);
    return reply.status(201).send(successResponse(novoUsuario));
  }

  async atualizar(request: FastifyRequest, reply: FastifyReply) {
    const { tenantId, tenantUserId } = request.user!;
    const { id } = request.params as { id: string };
    const data = atualizarUsuarioSchema.parse(request.body);
    const usuarioAtualizado = await usuariosService.atualizar(tenantId, tenantUserId, id, data);
    return reply.send(successResponse(usuarioAtualizado));
  }

  async alterarStatus(request: FastifyRequest, reply: FastifyReply) {
    const { tenantId, tenantUserId } = request.user!;
    const { id } = request.params as { id: string };
    const { isActive } = alterarStatusSchema.parse(request.body);
    const usuarioAtualizado = await usuariosService.alterarStatus(tenantId, tenantUserId, id, isActive);
    return reply.send(successResponse(usuarioAtualizado));
  }

  async excluir(request: FastifyRequest, reply: FastifyReply) {
    const { tenantId, tenantUserId } = request.user!;
    const { id } = request.params as { id: string };
    await usuariosService.excluir(tenantId, tenantUserId, id);
    return reply.status(204).send();
  }
}

export const usuariosController = new UsuariosController();
