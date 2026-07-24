import { FastifyInstance } from "fastify";
import { db } from "../../infra/database/db.js";
import { consumerProfiles, tenants, customers, transactions, redemptions, rewards } from "../../infra/database/schema.js";
import { eq, sql, and, desc, count } from "drizzle-orm";
import { successResponse, errorResponse } from "../../shared/http/response.js";
import { requireConsumerAuth } from "../../shared/security/require-consumer-auth.js";
import { supabaseAuthGateway } from "../../infra/auth/supabase-auth.gateway.js";
import { z } from "zod";

export async function consumerRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireConsumerAuth);

  app.get("/dashboard", async (request, reply) => {
    const userId = request.consumer?.authUserId;

    if (!userId) {
      return reply.status(401).send(errorResponse("Não autorizado.", "UNAUTHORIZED"));
    }

    try {
      // 1. Encontra o perfil do consumidor
      const [profile] = await db
        .select()
        .from(consumerProfiles)
        .where(eq(consumerProfiles.authUserId, userId))
        .limit(1);

      if (!profile) {
        return reply.status(404).send(errorResponse("Perfil de consumidor não encontrado.", "NOT_FOUND"));
      }

      const nowAt = new Date().toISOString();

      // 2. Busca todas as "contas" (customers) atreladas a esse perfil em diferentes lojas, com o saldo consolidado
      // Usando RAW query pela complexidade da consolidação
      const { rows } = await db.execute(sql`
        WITH app_clock AS (SELECT ${nowAt}::timestamptz AS now_at)
        SELECT 
          t.id AS tenant_id,
          t.name AS tenant_name,
          t.slug AS tenant_slug,
          t.logo_url AS tenant_logo,
          c.id AS customer_id,
          COALESCE(SUM(CASE
            WHEN tr.available_at <= (SELECT now_at FROM app_clock) AND tr.expires_at > (SELECT now_at FROM app_clock)
            THEN tr.remaining_points
            ELSE 0
          END), 0)::int AS pontos_disponiveis,
          COALESCE(SUM(CASE
            WHEN tr.available_at > (SELECT now_at FROM app_clock)
            THEN tr.remaining_points
            ELSE 0
          END), 0)::int AS pontos_pendentes,
          COALESCE(SUM(CASE
            WHEN tr.available_at <= (SELECT now_at FROM app_clock) 
                 AND tr.expires_at > (SELECT now_at FROM app_clock) 
                 AND tr.expires_at <= (SELECT now_at FROM app_clock) + INTERVAL '30 days'
            THEN tr.remaining_points
            ELSE 0
          END), 0)::int AS pontos_expirando
        FROM customers c
        INNER JOIN tenants t ON c.tenant_id = t.id
        LEFT JOIN transactions tr ON tr.customer_id = c.id
        WHERE c.consumer_profile_id = ${profile.id}
          AND c.deleted_at IS NULL
          AND t.is_active = true
        GROUP BY t.id, t.name, t.slug, t.logo_url, c.id
      `);

      return successResponse({
        profile: {
          name: profile.name,
          document: profile.document,
          email: request.consumer?.email,
          phone: profile.phone,
        },
        memberships: rows,
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send(errorResponse("Erro interno.", "INTERNAL_ERROR"));
    }
  });

  app.put("/profile", async (request, reply) => {
    const userId = request.consumer?.authUserId;
    if (!userId) {
      return reply.status(401).send(errorResponse("Não autorizado.", "UNAUTHORIZED"));
    }

    const bodySchema = z.object({
      name: z.string().min(2, "Nome muito curto").optional(),
      phone: z.string().optional(),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Dados inválidos.", "VALIDATION_ERROR"));
    }

    const { name, phone } = parsed.data;

    try {
      if (name || phone !== undefined) {
        await db.update(consumerProfiles)
          .set({ name, phone, updatedAt: new Date().toISOString() })
          .where(eq(consumerProfiles.authUserId, userId));
      }

      return successResponse({ message: "Perfil atualizado com sucesso." });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send(errorResponse("Erro interno.", "INTERNAL_ERROR"));
    }
  });

  app.post("/verify-password", async (request, reply) => {
    const userId = request.consumer?.authUserId;
    if (!userId) {
      return reply.status(401).send(errorResponse("Não autorizado.", "UNAUTHORIZED"));
    }

    const bodySchema = z.object({
      currentPassword: z.string().min(1, "Senha atual é obrigatória"),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Dados inválidos.", "VALIDATION_ERROR"));
    }

    const { currentPassword } = parsed.data;

    try {
      const isPasswordValid = await supabaseAuthGateway.verifyPassword(request.consumer!.email!, currentPassword);
      if (!isPasswordValid) {
        return reply.status(400).send(errorResponse("A senha atual informada está incorreta.", "VALIDATION_ERROR"));
      }

      return successResponse({ message: "Senha atual verificada com sucesso." });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send(errorResponse("Erro interno.", "INTERNAL_ERROR"));
    }
  });

  app.get("/tenant/:slug", async (request, reply) => {
    const userId = request.consumer?.authUserId;
    if (!userId) {
      return reply.status(401).send(errorResponse("Não autorizado.", "UNAUTHORIZED"));
    }

    const { slug } = request.params as { slug: string };

    try {
      // 1. Encontra o perfil do consumidor
      const [profile] = await db
        .select()
        .from(consumerProfiles)
        .where(eq(consumerProfiles.authUserId, userId))
        .limit(1);

      if (!profile) {
        return reply.status(404).send(errorResponse("Perfil não encontrado.", "NOT_FOUND"));
      }

      // 2. Busca o tenant
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, slug))
        .limit(1);

      if (!tenant) {
        return reply.status(404).send(errorResponse("Estabelecimento não encontrado.", "NOT_FOUND"));
      }

      // 3. Busca a conta (customer)
      const [customer] = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.tenantId, tenant.id),
            eq(customers.consumerProfileId, profile.id),
            sql`deleted_at IS NULL`
          )
        )
        .limit(1);

      if (!customer) {
        return reply.status(403).send(errorResponse("Você não possui vínculo com este estabelecimento.", "FORBIDDEN"));
      }

      // 4. Busca recompensas ativas
      const activeRewards = await db
        .select()
        .from(rewards)
        .where(
          and(
            eq(rewards.tenantId, tenant.id),
            eq(rewards.isActive, true),
            sql`deleted_at IS NULL`
          )
        )
        .orderBy(desc(rewards.createdAt));

      // 5. Calcula resumo (pontos, etc)
      const nowAt = new Date().toISOString();
      const { rows: rowsDisponiveis } = await db.execute<{ pontos_disponiveis: number }>(sql`
        SELECT 
          COALESCE(SUM(CASE
            WHEN available_at <= ${nowAt}::timestamptz AND expires_at > ${nowAt}::timestamptz
            THEN remaining_points
            ELSE 0
          END), 0)::int AS pontos_disponiveis
        FROM transactions
        WHERE customer_id = ${customer.id}
      `);
      const pontos_disponiveis = rowsDisponiveis[0]?.pontos_disponiveis || 0;

      // 6. Busca estatisticas do cliente (ultima transacao e total)
      const { rows: rowsTotal } = await db.execute<{ total_transactions: number }>(sql`
        SELECT COUNT(*)::int AS total_transactions FROM transactions WHERE customer_id = ${customer.id}
      `);
      const total_transactions = rowsTotal[0]?.total_transactions || 0;
      
      const [lastTx] = await db.select({ createdAt: transactions.createdAt })
        .from(transactions)
        .where(eq(transactions.customerId, customer.id))
        .orderBy(desc(transactions.createdAt))
        .limit(1);

      return successResponse({
        tenant: {
          id: tenant.id,
          name: tenant.name,
          tradingName: tenant.tradingName,
          slug: tenant.slug,
          logoUrl: tenant.logoUrl,
          email: tenant.email,
          phone: tenant.phone,
          addressLine1: tenant.addressLine1,
          addressNumber: tenant.addressNumber,
          addressCity: tenant.addressCity,
          addressState: tenant.addressState,
          latitude: tenant.latitude,
          longitude: tenant.longitude,
          socialLinks: tenant.socialLinks || null,
          pointsConversionReal: tenant.pointsConversionReal ? Number(tenant.pointsConversionReal) : 1.00,
          loyaltyGracePeriodDays: tenant.loyaltyGracePeriodDays || 0,
          loyaltyExpirationDays: tenant.loyaltyExpirationDays || 90,
          regulationNotes: tenant.regulationNotes || null,
          businessHours: tenant.businessHours || {
            monday: { active: false, open: "08:00", close: "18:00" },
            tuesday: { active: false, open: "08:00", close: "18:00" },
            wednesday: { active: false, open: "08:00", close: "18:00" },
            thursday: { active: false, open: "08:00", close: "18:00" },
            friday: { active: false, open: "08:00", close: "18:00" },
            saturday: { active: false, open: "08:00", close: "18:00" },
            sunday: { active: false, open: "08:00", close: "18:00" },
          },
        },
        rewards: activeRewards,
        summary: {
          pontos_disponiveis,
          total_transactions,
          last_transaction_date: lastTx?.createdAt || null,
        }
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send(errorResponse("Erro interno.", "INTERNAL_ERROR"));
    }
  });

  app.get("/tenant/:slug/transactions", async (request, reply) => {
    const userId = request.consumer?.authUserId;
    if (!userId) {
      return reply.status(401).send(errorResponse("Não autorizado.", "UNAUTHORIZED"));
    }

    const { slug } = request.params as { slug: string };

    try {
      const [profile] = await db
        .select()
        .from(consumerProfiles)
        .where(eq(consumerProfiles.authUserId, userId))
        .limit(1);

      if (!profile) {
        return reply.status(404).send(errorResponse("Perfil não encontrado.", "NOT_FOUND"));
      }

      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, slug))
        .limit(1);

      if (!tenant) {
        return reply.status(404).send(errorResponse("Estabelecimento não encontrado.", "NOT_FOUND"));
      }

      const [customer] = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.tenantId, tenant.id),
            eq(customers.consumerProfileId, profile.id),
            sql`deleted_at IS NULL`
          )
        )
        .limit(1);

      if (!customer) {
        return reply.status(403).send(errorResponse("Você não possui vínculo com este estabelecimento.", "FORBIDDEN"));
      }

      // Fetch earns
      const earns = await db
        .select()
        .from(transactions)
        .where(eq(transactions.customerId, customer.id));

      // Fetch spends with reward info
      const { rows: spends } = await db.execute<{
        id: number;
        created_at: string;
        points_spent: number;
        reward_name: string;
      }>(sql`
        SELECT r.id, r.created_at, r.points_spent, rew.name as reward_name
        FROM redemptions r
        JOIN rewards rew ON r.reward_id = rew.id
        WHERE r.customer_id = ${customer.id}
      `);

      // Fetch expirations
      const { rows: expirationsList } = await db.execute<{
        id: number;
        created_at: string;
        points_expired: number;
      }>(sql`
        SELECT e.id, e.created_at, e.points_expired
        FROM expirations e
        WHERE e.customer_id = ${customer.id}
      `);

      // Unify and sort
      const history = [
        ...earns.map(t => ({
          id: `earn_${t.id}`,
          type: "earn" as const,
          points: t.pointsEarned,
          description: `Compra de R$ ${Number(t.amountSpent).toFixed(2).replace('.', ',')}`,
          createdAt: t.createdAt,
        })),
        ...spends.map(r => ({
          id: `spend_${r.id}`,
          type: "spend" as const,
          points: r.points_spent,
          description: `Resgate: ${r.reward_name}`,
          createdAt: r.created_at,
        })),
        ...expirationsList.map(e => ({
          id: `expire_${e.id}`,
          type: "expire" as const,
          points: e.points_expired,
          description: "Pontos expirados",
          createdAt: e.created_at,
        }))
      ].sort((a, b) => new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime());

      return successResponse({ history });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send(errorResponse("Erro interno.", "INTERNAL_ERROR"));
    }
  });
}
