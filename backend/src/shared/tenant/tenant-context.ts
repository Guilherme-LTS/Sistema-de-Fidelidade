import { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors/app-error.js";

declare module "fastify" {
  interface FastifyRequest {
    tenantId?: string;
  }
}

/**
 * Hook do Fastify para extrair e validar o contexto de tenant nas requisições.
 */
export async function extractTenantContext(request: FastifyRequest, _reply: FastifyReply) {
  // 1. Se já resolvido pela autenticação
  if (request.user?.tenantId) {
    request.tenantId = request.user.tenantId;
    return;
  }

  // 2. Extrair do header customizado (útil para pré-autenticação ou rotas públicas específicas)
  const tenantIdHeader = request.headers["x-tenant-id"];
  if (tenantIdHeader && typeof tenantIdHeader === "string") {
    request.tenantId = tenantIdHeader;
    return;
  }
}

/**
 * Hook do Fastify para EXIGIR que o contexto de tenant esteja presente.
 */
export async function requireTenantContext(request: FastifyRequest, _reply: FastifyReply) {
  await extractTenantContext(request, _reply);

  if (!request.tenantId) {
    throw new AppError("Identificador de Tenant ausente na requisição.", 400, "MISSING_TENANT_ID");
  }
}
