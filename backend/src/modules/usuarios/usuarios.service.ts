import { db } from "../../infra/database/db.js";
import { tenantUsers, invitations, tenants } from "../../infra/database/schema.js";
import { eq, and, isNull } from "drizzle-orm";
import { AppError, NotFoundError } from "../../shared/errors/app-error.js";
import { supabaseAuthGateway } from "../../infra/auth/supabase-auth.gateway.js";
import { logAuditEvent } from "../../shared/audit.service.js";
import { EmailService } from "../../infra/email/email.service.js";

interface CriarUsuarioDTO {
  name?: string;
  email: string;
  password?: string;
  role: "admin" | "operador" | "novato";
}

interface AtualizarUsuarioDTO {
  name?: string;
  role?: "admin" | "operador" | "novato";
}

export class UsuariosService {
  async listar(tenantId: string) {
    const usuarios = await db.query.tenantUsers.findMany({
      where: and(eq(tenantUsers.tenantId, tenantId), isNull(tenantUsers.deletedAt)),
      orderBy: (tu, { asc }) => [asc(tu.name)],
    });

    const { data: { users }, error } = await supabaseAuthGateway.admin.listUsers();
    
    if (error) {
       console.error("Erro ao buscar usuários do Supabase", error);
    }

    const emailMap = new Map<string, string>();
    if (users) {
      for (const u of users) {
        emailMap.set(u.id, u.email || "");
      }
    }

    const mappedUsuarios = usuarios.map(u => ({
      ...u,
      email: u.userId ? emailMap.get(u.userId) : null,
    }));

    const pendingInvites = await db.query.invitations.findMany({
      where: and(eq(invitations.tenantId, tenantId), eq(invitations.status, "pending")),
    });

    const mappedInvites = pendingInvites.map(inv => ({
      id: inv.id,
      tenantId: inv.tenantId!,
      userId: null,
      name: "Convidado (Pendente)",
      phone: null,
      role: inv.role,
      isActive: false,
      status: "pending" as const,
      createdAt: inv.createdAt!,
      updatedAt: inv.updatedAt!,
      deletedAt: null,
      email: inv.email,
    }));

    return [...mappedUsuarios, ...mappedInvites];
  }

  async criar(tenantId: string, operatorId: string, data: CriarUsuarioDTO) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const existingInvite = await db.query.invitations.findFirst({
      where: and(eq(invitations.tenantId, tenantId), eq(invitations.email, data.email), eq(invitations.status, "pending"))
    });

    if (existingInvite) {
      throw new AppError("Já existe um convite pendente para este e-mail neste restaurante.", 400);
    }

    const { sql } = await import("drizzle-orm");
    const result = await db.execute(sql`SELECT id FROM auth.users WHERE email = ${data.email} LIMIT 1`);
    if (result.rows && result.rows.length > 0) {
      const authUserId = result.rows[0].id as string;
      const existingTenantUser = await db.query.tenantUsers.findFirst({
        where: and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, authUserId), isNull(tenantUsers.deletedAt)),
      });

      if (existingTenantUser) {
        throw new AppError("Este usuário já faz parte da sua equipe.", 400);
      }
    }

    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });

    const [novoConvite] = await db.insert(invitations).values({
      tenantId,
      email: data.email,
      role: data.role,
      expiresAt: expiresAt.toISOString(),
      status: "pending"
    }).returning();

    const emailService = EmailService.getInstance();
    await emailService.sendInvitation(data.email, novoConvite.token, tenant?.name || 'Restaurante', data.role);

    await logAuditEvent({
      tenantId,
      operatorId,
      action: "INVITE_USER",
      entityType: "CONVITE",
      entityId: novoConvite.id,
      metadata: { role: data.role, email: data.email },
    });

    return { id: novoConvite.id, email: data.email, name: data.name, role: data.role, status: "pending", isActive: false };
  }

  async atualizar(tenantId: string, operatorId: string, id: string, data: AtualizarUsuarioDTO) {
    const usuario = await db.query.tenantUsers.findFirst({
      where: and(eq(tenantUsers.id, id), eq(tenantUsers.tenantId, tenantId), isNull(tenantUsers.deletedAt)),
    });

    if (!usuario) {
      throw new NotFoundError("Usuário não encontrado.");
    }

    if (data.role && data.role !== usuario.role && usuario.userId) {
      await supabaseAuthGateway.admin.updateUserById(usuario.userId, {
        app_metadata: { tenant_id: tenantId, role: data.role },
      });
    }

    const [usuarioAtualizado] = await db.update(tenantUsers)
      .set({
        name: data.name !== undefined ? data.name : usuario.name,
        role: data.role !== undefined ? data.role : usuario.role,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tenantUsers.id, id))
      .returning();

    await logAuditEvent({
      tenantId,
      operatorId,
      action: "UPDATE_USER",
      entityType: "USUARIO",
      entityId: id,
      metadata: { alteracoes: data },
    });

    return usuarioAtualizado;
  }

  async alterarStatus(tenantId: string, operatorId: string, id: string, isActive: boolean) {
    const usuario = await db.query.tenantUsers.findFirst({
      where: and(eq(tenantUsers.id, id), eq(tenantUsers.tenantId, tenantId), isNull(tenantUsers.deletedAt)),
    });

    if (!usuario) {
      throw new NotFoundError("Usuário não encontrado.");
    }

    const [usuarioAtualizado] = await db.update(tenantUsers)
      .set({ isActive, updatedAt: new Date().toISOString() })
      .where(eq(tenantUsers.id, id))
      .returning();

    await logAuditEvent({
      tenantId,
      operatorId,
      action: isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
      entityType: "USUARIO",
      entityId: id,
      metadata: {},
    });

    return usuarioAtualizado;
  }

  async excluir(tenantId: string, operatorId: string, id: string) {
    const usuario = await db.query.tenantUsers.findFirst({
      where: and(eq(tenantUsers.id, id), eq(tenantUsers.tenantId, tenantId), isNull(tenantUsers.deletedAt)),
    });

    if (usuario) {
      await db.update(tenantUsers)
        .set({ deletedAt: new Date().toISOString(), isActive: false })
        .where(eq(tenantUsers.id, id));

      await logAuditEvent({
        tenantId,
        operatorId,
        action: "DELETE_USER",
        entityType: "USUARIO",
        entityId: id,
        metadata: { name: usuario.name },
      });
      return;
    }

    const invite = await db.query.invitations.findFirst({
      where: and(eq(invitations.id, id), eq(invitations.tenantId, tenantId)),
    });

    if (invite) {
      await db.delete(invitations)
        .where(eq(invitations.id, id));

      await logAuditEvent({
        tenantId,
        operatorId,
        action: "DELETE_USER",
        entityType: "CONVITE",
        entityId: id,
        metadata: { email: invite.email },
      });
      return;
    }

    throw new NotFoundError("Usuário ou convite não encontrado.");
  }
}

export const usuariosService = new UsuariosService();
