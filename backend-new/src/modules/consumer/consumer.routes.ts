import { FastifyInstance } from "fastify";
import { db } from "../../infra/database/db.js";
import { consumerProfiles, tenants, customers, transactions, redemptions } from "../../infra/database/schema.js";
import { eq, sql } from "drizzle-orm";
import { successResponse, errorResponse } from "../../shared/http/response.js";
import { requireAuth } from "../../shared/middlewares/require-auth.js";
import { getAppNow } from "../../shared/time/app-clock.js";

export async function consumerRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/dashboard", async (request, reply) => {
    const userId = request.user.id;

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

      const nowAt = getAppNow().toISOString();

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
        },
        memberships: rows,
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send(errorResponse("Erro interno.", "INTERNAL_ERROR"));
    }
  });
}
