import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../infra/database/db.js";
import { consumerProfiles, tenants, customers, transactions, rewards } from "../../infra/database/schema.js";
import { eq, sql, and, desc } from "drizzle-orm";
import { successResponse, errorResponse } from "../../shared/http/response.js";
import { supabaseAuthGateway } from "../../infra/auth/supabase-auth.gateway.js";
import { validateAndCleanCPF } from "../../shared/validators/cpf.js";

export async function publicRoutes(app: FastifyInstance) {
  app.get("/tenants/:slug", async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.status(400).send(errorResponse("Slug inválido.", "VALIDATION_ERROR"));
    }

    const { slug } = parsedParams.data;

    try {
      const [tenant] = await db
        .select({
          id: tenants.id,
          name: tenants.name,
          tradingName: tenants.tradingName,
          logoUrl: tenants.logoUrl,
          isActive: tenants.isActive,
        })
        .from(tenants)
        .where(eq(tenants.slug, slug))
        .limit(1);

      if (!tenant) {
        return reply.status(404).send(errorResponse("Estabelecimento não encontrado.", "NOT_FOUND"));
      }

      if (!tenant.isActive) {
        return reply.status(403).send(errorResponse("Estabelecimento inativo.", "FORBIDDEN"));
      }

      return successResponse(tenant);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send(errorResponse("Erro interno ao buscar estabelecimento.", "INTERNAL_ERROR"));
    }
  });

  app.get("/consumer/quick-check/:cpf", async (request, reply) => {
    const paramsSchema = z.object({
      cpf: z.string().min(1),
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.status(400).send(errorResponse("CPF inválido.", "VALIDATION_ERROR"));
    }

    const cpfValidation = validateAndCleanCPF(parsedParams.data.cpf);
    if (!cpfValidation.isValid) {
      return reply.status(400).send(errorResponse(cpfValidation.error || "CPF inválido.", "VALIDATION_ERROR"));
    }

    const document = cpfValidation.cleaned;

    try {
      const [profile] = await db
        .select({ id: consumerProfiles.id, name: consumerProfiles.name })
        .from(consumerProfiles)
        .where(eq(consumerProfiles.document, document))
        .limit(1);

      if (!profile) {
        return reply.status(404).send(errorResponse("CPF não encontrado.", "NOT_FOUND"));
      }

      const nowAt = new Date().toISOString();

      const { rows } = await db.execute(sql`
        WITH app_clock AS (SELECT ${nowAt}::timestamptz AS now_at),
        customer_points AS (
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
        )
        SELECT 
          cp.*,
          EXISTS (
            SELECT 1 FROM rewards r 
            WHERE r.tenant_id = cp.tenant_id 
              AND r.is_active = true 
              AND r.deleted_at IS NULL
              AND r.points_cost <= cp.pontos_disponiveis
          ) AS has_redeemable_reward,
          COALESCE(
            (
              SELECT json_agg(json_build_object(
                'id', r.id,
                'name', r.name,
                'pointsCost', r.points_cost,
                'imageUrl', r.image_url
              ) ORDER BY r.points_cost ASC)
              FROM rewards r
              WHERE r.tenant_id = cp.tenant_id
                AND r.is_active = true
                AND r.deleted_at IS NULL
            ), 
            '[]'::json
          ) AS rewards
        FROM customer_points cp
      `);

      const firstName = profile.name ? profile.name.split(" ")[0] : "Cliente";

      return successResponse({
        firstName,
        memberships: rows,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send(errorResponse("Erro interno ao buscar pontos.", "INTERNAL_ERROR"));
    }
  });

  app.get("/tenants/:slug/quick-check/:cpf", async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
      cpf: z.string().min(1),
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.status(400).send(errorResponse("Parâmetros inválidos.", "VALIDATION_ERROR"));
    }

    const { slug } = parsedParams.data;
    const cpfValidation = validateAndCleanCPF(parsedParams.data.cpf);
    if (!cpfValidation.isValid) {
      return reply.status(400).send(errorResponse(cpfValidation.error || "CPF inválido.", "VALIDATION_ERROR"));
    }

    const document = cpfValidation.cleaned;

    try {
      const [tenant] = await db
        .select({ id: tenants.id, name: tenants.name, logoUrl: tenants.logoUrl })
        .from(tenants)
        .where(eq(tenants.slug, slug))
        .limit(1);

      if (!tenant) {
        return reply.status(404).send(errorResponse("Estabelecimento não encontrado.", "NOT_FOUND"));
      }

      const [profile] = await db
        .select({ id: consumerProfiles.id, name: consumerProfiles.name })
        .from(consumerProfiles)
        .where(eq(consumerProfiles.document, document))
        .limit(1);

      if (!profile) {
        return reply.status(404).send(errorResponse("CPF não encontrado.", "NOT_FOUND"));
      }

      const [customer] = await db
        .select({ id: customers.id })
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
        return reply.status(404).send(errorResponse("CPF não possui vínculo com este estabelecimento.", "NOT_FOUND"));
      }

      const activeRewards = await db
        .select({
          id: rewards.id,
          name: rewards.name,
          description: rewards.description,
          imageUrl: rewards.imageUrl,
          pointsCost: rewards.pointsCost
        })
        .from(rewards)
        .where(
          and(
            eq(rewards.tenantId, tenant.id),
            eq(rewards.isActive, true),
            sql`deleted_at IS NULL`
          )
        )
        .orderBy(desc(rewards.createdAt));

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

      const firstName = profile.name ? profile.name.split(" ")[0] : "Cliente";

      return successResponse({
        tenant: {
          name: tenant.name,
          logoUrl: tenant.logoUrl,
        },
        firstName,
        points: pontos_disponiveis,
        rewards: activeRewards
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send(errorResponse("Erro interno ao buscar pontos.", "INTERNAL_ERROR"));
    }
  });

  app.post("/consumer/login", async (request, reply) => {
    const loginSchema = z.object({
      identifier: z.string().min(1),
      password: z.string().min(1),
    });

    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Dados inválidos.", "VALIDATION_ERROR"));
    }

    const { identifier, password } = parsed.data;
    let email = identifier;

    // Check if identifier is CPF
    const numericIdentifier = identifier.replace(/\D/g, "");
    if (numericIdentifier.length === 11 || (!identifier.includes("@") && numericIdentifier.length > 0)) {
      const cpfValidation = validateAndCleanCPF(numericIdentifier);
      if (!cpfValidation.isValid) {
        return reply.status(400).send(errorResponse(cpfValidation.error || "CPF inválido.", "VALIDATION_ERROR"));
      }

      try {
        const [profile] = await db
          .select({ authUserId: consumerProfiles.authUserId })
          .from(consumerProfiles)
          .where(eq(consumerProfiles.document, cpfValidation.cleaned))
          .limit(1);

        if (!profile || !profile.authUserId) {
          return reply.status(401).send(errorResponse("E-mail, CPF ou senha inválidos.", "UNAUTHORIZED"));
        }

        // Get email from Supabase Auth Admin
        const { data: { user }, error: adminError } = await supabaseAuthGateway.admin.getUserById(profile.authUserId);
        if (adminError || !user || !user.email) {
          return reply.status(401).send(errorResponse("E-mail, CPF ou senha inválidos.", "UNAUTHORIZED"));
        }
        
        email = user.email;
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send(errorResponse("Erro ao resolver CPF.", "INTERNAL_ERROR"));
      }
    }

    try {
      const data = await supabaseAuthGateway.signIn(email, password);
      return successResponse(data);
    } catch (error: any) {
      // Supabase signIn error
      if (error.message === "Invalid login credentials") {
        return reply.status(401).send(errorResponse("E-mail, CPF ou senha inválidos.", "UNAUTHORIZED"));
      }
      request.log.error(error);
      return reply.status(401).send(errorResponse(error.message || "Credenciais inválidas.", "UNAUTHORIZED"));
    }
  });

  app.post("/consumer/signup", async (request, reply) => {
    const signupSchema = z.object({
      name: z.string().min(3),
      cpf: z.string().min(11),
      email: z.string().email(),
      password: z.string().min(6),
    });

    const parsed = signupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Dados inválidos.", "VALIDATION_ERROR"));
    }

    const { name, cpf, email, password } = parsed.data;
    const cpfValidation = validateAndCleanCPF(cpf);
    if (!cpfValidation.isValid) {
      return reply.status(400).send(errorResponse(cpfValidation.error || "CPF inválido.", "VALIDATION_ERROR"));
    }
    const document = cpfValidation.cleaned;

    let createdUserId: string | undefined;

    try {
      // 0. Preventiva: Verificar se o CPF já existe E JÁ TEM LOGIN ATIVO no Supabase
      const [existingProfile] = await db
        .select({ id: consumerProfiles.id, authUserId: consumerProfiles.authUserId })
        .from(consumerProfiles)
        .where(eq(consumerProfiles.document, document))
        .limit(1);

      if (existingProfile && existingProfile.authUserId) {
        const { data: { user: existingAuthUser }, error: checkAuthErr } = await supabaseAuthGateway.admin.getUserById(existingProfile.authUserId);
        if (!checkAuthErr && existingAuthUser) {
          return reply.status(409).send(errorResponse("Já existe uma conta vinculada a este CPF.", "CONFLICT"));
        }
        // Se o usuário do Supabase Auth não existe mais (ID órfão), limpa a referência para permitir o novo vínculo
        await db.update(consumerProfiles)
          .set({ authUserId: null, updatedAt: new Date().toISOString() })
          .where(eq(consumerProfiles.id, existingProfile.id));
      }

      // 1. Create user via Supabase Admin (bypassing email confirmation)
      const { data: { user }, error: createError } = await supabaseAuthGateway.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          isConsumer: 'true',
          name,
          document,
        }
      });

      if (createError) {
        const msg = createError.message?.toLowerCase() || "";
        if (
          msg.includes("already registered") ||
          msg.includes("already exists") ||
          msg.includes("already been registered")
        ) {
          return reply.status(409).send(errorResponse("O e-mail informado já está em uso.", "CONFLICT"));
        }
        throw createError;
      }

      if (user) {
        createdUserId = user.id;

        // Update the consumer profile created by the trigger to store the LGPD consent info
        await db.update(consumerProfiles)
          .set({
            lgpdConsent: true,
            consentDate: new Date().toISOString(),
            consentIp: request.ip,
            consentUserAgent: request.headers['user-agent'] || null,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(consumerProfiles.authUserId, user.id));
      }

      // 2. The DB Trigger (handle_new_user) will create the consumer_profiles entry automatically.
      
      // 3. Sign in to generate a session to return to the frontend
      const sessionData = await supabaseAuthGateway.signIn(email, password);
      
      return successResponse(sessionData);
    } catch (error: any) {
      request.log.error(error);
      // Clean up user se ocorreu alguma falha logo após a criação (ex: Trigger falhou por outro motivo)
      if (createdUserId) {
        await supabaseAuthGateway.admin.deleteUser(createdUserId).catch(() => {});
      }
      
      if (error.code === '23505' && error.constraint === 'consumer_profiles_document_unique') {
         return reply.status(409).send(errorResponse("Já existe uma conta vinculada a este CPF.", "CONFLICT"));
      }
      
      const errMsg = typeof error?.message === 'string' && error.message !== '{}' 
        ? error.message 
        : "Erro interno ao processar o cadastro.";
        
      return reply.status(500).send(errorResponse(errMsg, "INTERNAL_ERROR"));
    }
  });

  // Função auxiliar para mascarar o e-mail preservando privacidade (LGPD)
  function maskEmail(emailStr: string): string {
    const [localPart, domain] = emailStr.split("@");
    if (!localPart || !domain) return emailStr;
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    }
    return `${localPart.substring(0, 3)}***@${domain}`;
  }

  app.post("/consumer/recover-password", async (request, reply) => {
    const recoverSchema = z.object({
      identifier: z.string().min(1),
    });

    const parsed = recoverSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Dados inválidos.", "VALIDATION_ERROR"));
    }

    const { identifier } = parsed.data;
    let email = identifier.includes("@") ? identifier : null;
    let hasPointsOnly = false;
    let hasAccount = false;

    const numericIdentifier = identifier.replace(/\D/g, "");
    if (numericIdentifier.length === 11 || (!identifier.includes("@") && numericIdentifier.length > 0)) {
      const cpfValidation = validateAndCleanCPF(numericIdentifier);
      if (!cpfValidation.isValid) {
        return reply.status(400).send(errorResponse(cpfValidation.error || "CPF inválido.", "VALIDATION_ERROR"));
      }

      try {
        const [profile] = await db
          .select({ id: consumerProfiles.id, authUserId: consumerProfiles.authUserId })
          .from(consumerProfiles)
          .where(eq(consumerProfiles.document, cpfValidation.cleaned))
          .limit(1);

        if (profile) {
          if (profile.authUserId) {
            const { data: { user }, error: adminError } = await supabaseAuthGateway.admin.getUserById(profile.authUserId);
            if (!adminError && user && user.email) {
              email = user.email;
              hasAccount = true;
            } else {
              // Se o authUserId for um registro órfão (usuário deletado do Supabase), auto-corrige e trata como POINTS_ONLY
              await db.update(consumerProfiles)
                .set({ authUserId: null, updatedAt: new Date().toISOString() })
                .where(eq(consumerProfiles.id, profile.id));
              hasPointsOnly = true;
            }
          } else {
            hasPointsOnly = true;
          }
        }
      } catch (error) {
        request.log.error(error);
      }
    } else if (email) {
      // Se informou um e-mail diretamente, vamos validar se existe alguma conta associada a ele
      try {
        const { data: { users }, error: listError } = await supabaseAuthGateway.admin.listUsers();
        if (!listError && users) {
          const matchedUser = users.find(u => u.email?.toLowerCase() === email!.toLowerCase());
          if (matchedUser) {
            hasAccount = true;
          }
        }
      } catch (error) {
        request.log.error(error);
      }
    }

    // Se temos um e-mail válido e o perfil existe, disparamos a recuperação real
    if (hasAccount && email && email.includes("@")) {
      try {
        const redirectTo = `${process.env.FRONTEND_URL || "http://localhost:3000"}/alterar-senha`;
        await supabaseAuthGateway.resetPasswordForEmail(email, redirectTo);
        
        return successResponse({
          status: "SUCCESS_EMAIL_SENT",
          message: "Link de redefinição de senha enviado com sucesso.",
          maskedEmail: maskEmail(email),
        });
      } catch (e) {
        request.log.error(e);
        return reply.status(500).send(errorResponse("Erro ao enviar e-mail de recuperação.", "INTERNAL_ERROR"));
      }
    }

    if (hasPointsOnly) {
      return successResponse({
        status: "POINTS_ONLY",
        message: "Seu CPF possui pontos cadastrados, mas você ainda não criou uma senha de acesso. Vá na aba 'Criar Conta' para cadastrar sua senha.",
      });
    }

    // Como a verificação por CPF já é pública por design na aplicação (aba "Pontos"),
    // podemos retornar 404 de forma amigável se não encontrarmos nada
    return reply.status(404).send(errorResponse(
      "Nenhuma conta ou pontos encontrados para este CPF/E-mail. Verifique os dados ou crie uma conta.",
      "NOT_FOUND"
    ));
  });
}
