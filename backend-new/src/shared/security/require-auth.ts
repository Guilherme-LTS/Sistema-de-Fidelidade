import { FastifyReply, FastifyRequest } from "fastify";
import { UnauthorizedError, ForbiddenError } from "../errors/app-error.js";
import { supabaseAuthGateway } from "../../infra/auth/supabase-auth.gateway.js";
import { db } from "../../infra/database/db.js";

export type AuthenticatedUser = {
  authUserId: string;
  tenantUserId: string;
  tenantId: string;
  tenantName: string;
  tenantLogoUrl?: string | null;
  role: "admin" | "operador";
  email?: string;
  name: string;
};

// Declaração para estender o FastifyRequest com a propriedade do usuário autenticado
declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}



/**
 * Middleware/Hook para requerer autenticação via JWT do Supabase e carregar perfil de tenant.
 */
export async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
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

  // 2. Consultar o banco de dados para recuperar o perfil de funcionário (tenant_users) e tenant ativos
  const tenantUserRecord = await db.query.tenantUsers.findFirst({
    where: (tu, { eq, and, isNull }) =>
      and(
        eq(tu.userId, supabaseUser.id),
        eq(tu.isActive, true),
        isNull(tu.deletedAt)
      ),
    with: {
      tenant: true,
    },
  });

  if (!tenantUserRecord || !tenantUserRecord.tenant?.isActive) {
    throw new ForbiddenError("Usuário sem perfil de funcionário ativo associado a um Tenant.");
  }

  // 3. Montar e injetar o AuthenticatedUser no request
  request.user = {
    authUserId: supabaseUser.id,
    tenantUserId: tenantUserRecord.id,
    tenantId: tenantUserRecord.tenantId!,
    tenantName: tenantUserRecord.tenant?.name || "Restaurante",
    tenantLogoUrl: tenantUserRecord.tenant?.logoUrl,
    role: tenantUserRecord.role,
    email: supabaseUser.email,
    name: tenantUserRecord.name,
  };
}
