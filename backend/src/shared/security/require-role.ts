import { FastifyReply, FastifyRequest } from "fastify";
import { ForbiddenError, UnauthorizedError } from "../errors/app-error.js";

/**
 * Middleware factory para requerer roles específicos do usuário autenticado.
 */
export function requireRole(allowedRoles: ("admin" | "operador" | "novato")[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError("Usuário não autenticado no contexto da requisição.");
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw new ForbiddenError("Você não tem permissão para acessar este recurso.");
    }
  };
}
