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
  role: "admin" | "operador" | "novato";
  email?: string;
  phone?: string | null;
  name: string;
  subscriptionStatus?: string | null;
  subscriptionCurrentPeriodEnd?: string | null;
  subscriptionPriceId?: string | null;
  cancelAtPeriodEnd?: boolean;
  trialOnboardingShown?: boolean;
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

  const requestedTenantId = request.headers["x-tenant-id"] as string | undefined;

  // 2. Consultar o banco de dados para recuperar o perfil de funcionário (tenant_users) e tenant ativos
  const tenantUserRecord = await db.query.tenantUsers.findFirst({
    where: (tu, { eq, and, isNull }) => {
      const conditions = [
        eq(tu.userId, supabaseUser.id),
        eq(tu.isActive, true),
        eq(tu.status, "active"),
        isNull(tu.deletedAt)
      ];
      if (requestedTenantId) {
        conditions.push(eq(tu.tenantId, requestedTenantId));
      }
      return and(...conditions);
    },
    with: {
      tenant: true,
    },
  });

  if (!tenantUserRecord || !tenantUserRecord.tenant?.isActive) {
    // 2.1. Verificar se o usuário possui QUALQUER registro histórico de tenant (desativado ou inativo)
    const anyRecord = await db.query.tenantUsers.findFirst({
      where: (tu, { eq, and, isNull }) =>
        and(eq(tu.userId, supabaseUser.id), isNull(tu.deletedAt))
    });

    if (anyRecord) {
      throw new ForbiddenError("Seu acesso ao sistema foi desativado. Entre em contato com o proprietário da conta ou administrador.");
    }

    // 2.2. Se não possuir nenhum registro, trata-se de um novato legítimo (ex: convite pendente)
    const isAllowedNovatoRoute = 
      request.url.includes("/auth/invitations") || 
      request.url.includes("/auth/me") || 
      request.url.includes("/auth/tenants");

    if (isAllowedNovatoRoute) {
      request.user = {
        authUserId: supabaseUser.id,
        tenantUserId: "",
        tenantId: "",
        tenantName: "",
        role: "novato",
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0] || "Usuário",
      };
      return;
    }
    
    throw new ForbiddenError("Acesso pendente de ativação de convite.");
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
    phone: tenantUserRecord.phone,
    name: tenantUserRecord.name,
    subscriptionStatus: tenantUserRecord.tenant?.subscriptionStatus,
    subscriptionCurrentPeriodEnd: tenantUserRecord.tenant?.subscriptionCurrentPeriodEnd,
    subscriptionPriceId: tenantUserRecord.tenant?.subscriptionPriceId,
    cancelAtPeriodEnd: tenantUserRecord.tenant?.cancelAtPeriodEnd ?? false,
    trialOnboardingShown: tenantUserRecord.tenant?.trialOnboardingShown ?? false,
  };
}
