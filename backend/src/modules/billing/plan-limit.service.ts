import { db } from "../../infra/database/db.js";
import { tenants, tenantUsers, invitations } from "../../infra/database/schema.js";
import { eq, and, isNull, count } from "drizzle-orm";
import { AppError } from "../../shared/errors/app-error.js";

export interface PlanLimits {
  name: "Trial" | "Pro" | "Bloqueado";
  maxOperators: number;
  maxCustomers: number;
  allowCustomRegulation: boolean;
}

export const PLAN_LIMITS_MAP = {
  BLOQUEADO: {
    name: "Bloqueado",
    maxOperators: 0,
    maxCustomers: 0,
    allowCustomRegulation: false,
  } as PlanLimits,

  PRO: {
    name: "Pro",
    maxOperators: 10,
    maxCustomers: Infinity,
    allowCustomRegulation: true,
  } as PlanLimits,
};

class PlanLimitService {
  /**
   * Obtém os limites vigentes de um Tenant com base no status da assinatura.
   */
  async getTenantLimits(tenantId: string, tx?: any): Promise<PlanLimits> {
    const queryExecutor = tx || db;
    const tenant = await queryExecutor.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      throw new AppError("Estabelecimento não encontrado.", 404);
    }

    const status = tenant.subscriptionStatus;

    // Se a assinatura está cancelada, não-paga ou inadimplente
    const isCanceled = status === "canceled" || status === "unpaid" || status === "past_due" || !status;
    
    // Validar se o trial expirou localmente (sem assinatura vinculada na Stripe)
    let isTrialExpired = false;
    if (status === "trialing" && !tenant.stripeSubscriptionId) {
      const now = new Date();
      const periodEnd = tenant.subscriptionCurrentPeriodEnd
        ? new Date(tenant.subscriptionCurrentPeriodEnd)
        : null;
      if (periodEnd && periodEnd < now) {
        isTrialExpired = true;
      }
    }

    if (isCanceled || isTrialExpired) {
      return PLAN_LIMITS_MAP.BLOQUEADO;
    }

    return PLAN_LIMITS_MAP.PRO;
  }

  /**
   * Valida se o Tenant pode adicionar mais um operador (atendente).
   * Conta usuários de equipe ativos com role = 'operador' + convites pendentes com role = 'operador'.
   */
  async checkOperatorLimit(tenantId: string, tx?: any): Promise<void> {
    const limits = await this.getTenantLimits(tenantId, tx);
    
    if (limits.maxOperators === Infinity) return;

    const queryExecutor = tx || db;

    // 1. Contar usuários de equipe ativos com role 'operador'
    const activeOperatorsResult = await queryExecutor
      .select({ val: count() })
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.role, "operador"),
          eq(tenantUsers.isActive, true),
          isNull(tenantUsers.deletedAt)
        )
      );
    const activeOperatorsCount = activeOperatorsResult[0]?.val || 0;

    // 2. Contar convites pendentes com role 'operador'
    const pendingInvitesResult = await queryExecutor
      .select({ val: count() })
      .from(invitations)
      .where(
        and(
          eq(invitations.tenantId, tenantId),
          eq(invitations.role, "operador"),
          eq(invitations.status, "pending")
        )
      );
    const pendingInvitesCount = pendingInvitesResult[0]?.val || 0;

    const totalOperators = activeOperatorsCount + pendingInvitesCount;

    if (totalOperators >= limits.maxOperators) {
      throw new AppError(
        `Limite de operadores excedido. Seu plano atual permite no máximo ${limits.maxOperators} operadores ativos.`,
        422
      );
    }
  }

  /**
   * Retorna o uso atual de recursos do restaurante.
   */
  async getTenantUsage(tenantId: string, tx?: any) {
    const queryExecutor = tx || db;

    // Contar operadores ativos
    const activeOperatorsResult = await queryExecutor
      .select({ val: count() })
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.role, "operador"),
          eq(tenantUsers.isActive, true),
          isNull(tenantUsers.deletedAt)
        )
      );
    const activeOperatorsCount = activeOperatorsResult[0]?.val || 0;

    // Contar convites pendentes de operadores
    const pendingInvitesResult = await queryExecutor
      .select({ val: count() })
      .from(invitations)
      .where(
        and(
          eq(invitations.tenantId, tenantId),
          eq(invitations.role, "operador"),
          eq(invitations.status, "pending")
        )
      );
    const pendingInvitesCount = pendingInvitesResult[0]?.val || 0;

    // Contar total de clientes
    const { customers } = await import("../../infra/database/schema.js");
    const customersResult = await queryExecutor
      .select({ val: count() })
      .from(customers)
      .where(eq(customers.tenantId, tenantId));
    const dbCustomersCount = customersResult[0]?.val || 0;

    return {
      operators: activeOperatorsCount + pendingInvitesCount,
      customers: dbCustomersCount,
    };
  }
}

export const planLimitService = new PlanLimitService();
