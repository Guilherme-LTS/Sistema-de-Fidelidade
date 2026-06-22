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
}
