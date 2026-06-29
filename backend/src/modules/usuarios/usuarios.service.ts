import { db } from "../../infra/database/db.js";
import { tenantUsers } from "../../infra/database/schema.js";
import { eq, and, isNull } from "drizzle-orm";
import { AppError, NotFoundError } from "../../shared/errors/app-error.js";
import { supabaseAuthGateway } from "../../infra/auth/supabase-auth.gateway.js";
import { logAuditEvent } from "../../shared/audit.service.js";

interface CriarUsuarioDTO {
  name: string;
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

    return usuarios.map(u => ({
      ...u,
      email: u.userId ? emailMap.get(u.userId) : null,
    }));
  }

  async criar(tenantId: string, operatorId: string, data: CriarUsuarioDTO) {
    let authUserId: string | null = null;

    const { data: authData, error: authError } = await supabaseAuthGateway.admin.createUser({
      email: data.email,
      password: data.password || "Restaurante@123",
      email_confirm: true,
      app_metadata: {
        tenant_id: tenantId,
        role: data.role,
      },
    });

    if (authError) {
      if (authError.message.toLowerCase().includes("already registered") || authError.message.toLowerCase().includes("already exists")) {
        const { sql } = await import("drizzle-orm");
        const result = await db.execute(sql`SELECT id FROM auth.users WHERE email = ${data.email} LIMIT 1`);
        if (result.rows && result.rows.length > 0) {
          authUserId = result.rows[0].id as string;
        } else {
          throw new AppError("Erro ao vincular usuário existente. Tente novamente mais tarde.", 400);
        }
      } else {
        throw new AppError("Não foi possível criar o usuário. Verifique se o e-mail é válido ou se já está em uso.", 400);
      }
    } else {
      authUserId = authData.user.id;
    }

    if (!authUserId) {
      throw new AppError("Erro na criação das credenciais de acesso.", 500);
    }

    // Verifica se já existe um vínculo ativo
    const existingTenantUser = await db.query.tenantUsers.findFirst({
      where: and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, authUserId), isNull(tenantUsers.deletedAt)),
    });

    if (existingTenantUser) {
      throw new AppError("Este usuário já faz parte da sua equipe.", 400);
    }

    const [novoUsuario] = await db.insert(tenantUsers).values({
      tenantId,
      userId: authUserId,
      name: data.name,
      role: data.role,
      isActive: true,
    }).returning();

    await logAuditEvent({
      tenantId,
      operatorId,
      action: "CREATE_USER",
      entityType: "USUARIO",
      entityId: novoUsuario.id,
      metadata: { name: data.name, role: data.role, email: data.email },
    });

    return { ...novoUsuario, email: data.email };
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

    if (!usuario) {
      throw new NotFoundError("Usuário não encontrado.");
    }

    await db.update(tenantUsers)
      .set({ deletedAt: new Date().toISOString(), isActive: false })
      .where(eq(tenantUsers.id, id));

    // Removido a deleção física do auth.users (Soft Delete & Opção B)
    // Mantemos o usuário vivo globalmente para que ele possa continuar acessando outros tenants se existir.

    await logAuditEvent({
      tenantId,
      operatorId,
      action: "DELETE_USER",
      entityType: "USUARIO",
      entityId: id,
      metadata: { name: usuario.name },
    });
  }
}

export const usuariosService = new UsuariosService();
