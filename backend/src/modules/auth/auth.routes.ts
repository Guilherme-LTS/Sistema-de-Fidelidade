import { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/security/require-auth.js";
import { successResponse } from "../../shared/http/response.js";
import { z } from "zod";
import { AppError } from "../../shared/errors/app-error.js";
import { supabaseAuthGateway } from "../../infra/auth/supabase-auth.gateway.js";
import { db } from "../../infra/database/db.js";
import { auditLogs } from "../../infra/database/schema.js";

export async function authRoutes(app: FastifyInstance) {
  // Rota para obter os dados do usuário autenticado
  app.get(
    "/me",
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      // O request.user é populado pelo requireAuth
      const user = request.user!;

      // Retorna os dados mapeados para o que o frontend espera (UsuarioPerfil)
      return successResponse({
        id: user.tenantUserId,
        user_id: user.authUserId,
        nome: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        tenant_id: user.tenantId,
        tenant_name: user.tenantName,
        tenant_logo_url: user.tenantLogoUrl,
      });
    }
  );

  // Rota para alterar a própria senha
  app.post(
    "/change-password",
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user!;
      if (!user.email) {
        throw new AppError("Usuário não possui e-mail cadastrado para redefinir senha.");
      }

      const bodySchema = z.object({
        currentPassword: z.string().min(1, "Senha atual é obrigatória"),
        newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres"),
      });

      const { currentPassword, newPassword } = bodySchema.parse(request.body);

      // 1. Verifica se a senha atual está correta usando login temporário
      const isPasswordValid = await supabaseAuthGateway.verifyPassword(user.email, currentPassword);
      if (!isPasswordValid) {
        throw new AppError("A senha atual informada está incorreta.");
      }

      // 2. Atualiza a senha usando privilégios de admin
      await supabaseAuthGateway.updatePassword(user.authUserId, newPassword);

      // 3. Registra ação na auditoria
      await db.insert(auditLogs).values({
        tenantId: user.tenantId,
        operatorId: user.tenantUserId,
        action: "UPDATE_PASSWORD",
        entityType: "USER",
        entityId: user.tenantUserId,
        metadata: JSON.stringify({ email: user.email }),
        status: "SUCESSO",
      });

      return successResponse({ message: "Senha alterada com sucesso." });
    }
  );

  // Rota para atualizar o próprio perfil (nome e telefone)
  app.put(
    "/profile",
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user!;

      const bodySchema = z.object({
        name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
        phone: z.string().optional(),
      });

      const { name, phone } = bodySchema.parse(request.body);

      // Atualiza o registro do tenant_users atual
      const { eq } = await import("drizzle-orm");
      const { tenantUsers } = await import("../../infra/database/schema.js");
      
      await db.update(tenantUsers)
        .set({ name, phone, updatedAt: new Date().toISOString() })
        .where(eq(tenantUsers.id, user.tenantUserId));

      // Registra ação na auditoria
      await db.insert(auditLogs).values({
        tenantId: user.tenantId,
        operatorId: user.tenantUserId,
        action: "UPDATE_USER",
        entityType: "USER",
        entityId: user.tenantUserId,
        metadata: JSON.stringify({ oldName: user.name, newName: name }),
        status: "SUCESSO",
      });

      return successResponse({ message: "Perfil atualizado com sucesso." });
    }
  );

  app.get(
    "/tenants",
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user!;
      const { isNull, eq, and } = await import("drizzle-orm");
      
      const userTenants = await db.query.tenantUsers.findMany({
        where: (tu, { eq, and, isNull }) =>
          and(
            eq(tu.userId, user.authUserId),
            eq(tu.isActive, true),
            eq(tu.status, "active"),
            isNull(tu.deletedAt)
          ),
        with: {
          tenant: true,
        },
      });

      return successResponse(userTenants.map(ut => ({
        tenantUserId: ut.id,
        tenantId: ut.tenantId,
        tenantName: ut.tenant?.name,
        tenantLogoUrl: ut.tenant?.logoUrl,
        role: ut.role,
      })));
    }
  );

  app.get(
    "/invitations",
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user!;
      const { eq, and } = await import("drizzle-orm");
      const { invitations } = await import("../../infra/database/schema.js");

      const pendingInvitations = await db.query.invitations.findMany({
        where: and(
          eq(invitations.email, user.email!),
          eq(invitations.status, "pending")
        ),
        with: {
          tenant: true,
        },
      });

      return successResponse(pendingInvitations.map(inv => ({
        id: inv.token, // we return token as ID to the frontend
        tenantName: inv.tenant?.name,
        tenantLogoUrl: inv.tenant?.logoUrl,
        role: inv.role,
        createdAt: inv.createdAt,
      })));
    }
  );

  app.post(
    "/invitations/:token/accept",
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user!;
      const { token } = request.params as { token: string };
      const { eq, and, isNull } = await import("drizzle-orm");
      const { invitations, tenantUsers } = await import("../../infra/database/schema.js");

      const invite = await db.query.invitations.findFirst({
        where: and(
          eq(invitations.token, token),
          eq(invitations.email, user.email!),
          eq(invitations.status, "pending")
        )
      });

      if (!invite) {
        throw new AppError("Convite não encontrado, expirado ou não pertence a este e-mail.", 404);
      }

      // Check if user is already in the tenant
      const existing = await db.query.tenantUsers.findFirst({
        where: and(
          eq(tenantUsers.tenantId, invite.tenantId!),
          eq(tenantUsers.userId, user.authUserId),
          isNull(tenantUsers.deletedAt)
        )
      });

      if (!existing) {
        // Create user in tenant
        await db.insert(tenantUsers).values({
          tenantId: invite.tenantId!,
          userId: user.authUserId,
          name: user.name,
          role: invite.role,
          isActive: true,
          status: "active",
        });
      }

      // Mark invite as accepted
      await db.update(invitations)
        .set({
          status: "accepted",
          updatedAt: new Date().toISOString()
        })
        .where(eq(invitations.id, invite.id));

      await db.insert(auditLogs).values({
        tenantId: invite.tenantId!,
        operatorId: user.tenantUserId || user.authUserId,
        action: "ACTIVATE_USER",
        entityType: "USER",
        entityId: user.authUserId,
        metadata: JSON.stringify({ email: user.email, source: "invitation" }),
        status: "SUCESSO",
      });

      return successResponse({ message: "Convite aceito com sucesso." });
    }
  );

  app.post(
    "/invitations/:token/decline",
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user!;
      const { token } = request.params as { token: string };
      const { eq, and } = await import("drizzle-orm");
      const { invitations } = await import("../../infra/database/schema.js");

      const invite = await db.query.invitations.findFirst({
        where: and(
          eq(invitations.token, token),
          eq(invitations.email, user.email!),
          eq(invitations.status, "pending")
        )
      });

      if (!invite) {
        throw new AppError("Convite não encontrado ou já processado.", 404);
      }

      await db.update(invitations)
        .set({
          status: "revoked",
          updatedAt: new Date().toISOString()
        })
        .where(eq(invitations.id, invite.id));

      return successResponse({ message: "Convite recusado com sucesso." });
    }
  );

  app.get(
    "/invitations/public/:token",
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const { eq, and } = await import("drizzle-orm");
      const { invitations } = await import("../../infra/database/schema.js");

      const invite = await db.query.invitations.findFirst({
        where: and(
          eq(invitations.token, token),
          eq(invitations.status, "pending")
        ),
        with: {
          tenant: true,
        }
      });

      if (!invite) {
        throw new AppError("Convite não encontrado ou já expirado.", 404);
      }

      if (new Date(invite.expiresAt) < new Date()) {
        await db.update(invitations)
          .set({ status: "expired" })
          .where(eq(invitations.id, invite.id));
        throw new AppError("Este convite expirou.", 400);
      }

      return successResponse({
        email: invite.email,
        role: invite.role,
        tenantName: invite.tenant?.name,
        tenantLogoUrl: invite.tenant?.logoUrl,
      });
    }
  );
}
