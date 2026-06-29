import { FastifyReply, FastifyRequest } from "fastify";
import { UnauthorizedError } from "../errors/app-error.js";
import { supabaseAuthGateway } from "../../infra/auth/supabase-auth.gateway.js";

export type AuthenticatedConsumer = {
  authUserId: string;
  email?: string;
};

declare module "fastify" {
  interface FastifyRequest {
    consumer?: AuthenticatedConsumer;
  }
}

/**
 * Middleware para requerer autenticação via JWT do Supabase para consumidores finais.
 * Não exige vínculo com um Tenant (tenant_users).
 */
export async function requireConsumerAuth(request: FastifyRequest, _reply: FastifyReply) {
  if (request.method === "OPTIONS") return;

  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Token de acesso não fornecido ou inválido.");
  }

  const token = authHeader.split(" ")[1];

  // 1. Validar o token JWT contra o Supabase Auth
  const supabaseUser = await supabaseAuthGateway.getUser(token);
  if (!supabaseUser) {
    throw new UnauthorizedError("Token inválido ou expirado.");
  }

  // 2. Montar e injetar o AuthenticatedConsumer no request
  request.consumer = {
    authUserId: supabaseUser.id,
    email: supabaseUser.email,
  };
}
