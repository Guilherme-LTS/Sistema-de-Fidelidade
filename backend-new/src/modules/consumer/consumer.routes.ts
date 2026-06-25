import { FastifyInstance } from "fastify";
import { db } from "../../infra/database/db.js";
import { consumerProfiles, tenants, customers, transactions, redemptions } from "../../infra/database/schema.js";
import { eq, sql } from "drizzle-orm";
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
      email: z.string().email("E-mail inválido")
        .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Formato de e-mail inválido")
        .refine(val => !val || !val.endsWith("gmaill.com"), { message: "O domínio do e-mail parece inválido. Você quis dizer gmail.com?" })
        .refine(val => !val || !val.endsWith("hotmai.com"), { message: "O domínio do e-mail parece inválido. Você quis dizer hotmail.com?" })
        .refine(val => !val || !val.endsWith("yahool.com"), { message: "O domínio do e-mail parece inválido. Você quis dizer yahoo.com?" })
        .optional(),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Dados inválidos.", "VALIDATION_ERROR"));
    }

    const { name, phone, email } = parsed.data;

    try {
      if (name || phone !== undefined) {
        await db.update(consumerProfiles)
          .set({ name, phone, updatedAt: new Date().toISOString() })
          .where(eq(consumerProfiles.authUserId, userId));
      }

      if (email && email !== request.consumer?.email) {
        const { error } = await supabaseAuthGateway.admin.updateUserById(userId, { email });
        if (error) {
          if (error.message.includes("Email address already exists")) {
            return reply.status(409).send(errorResponse("Este e-mail já está em uso.", "CONFLICT"));
          }
          throw error;
        }
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
}
