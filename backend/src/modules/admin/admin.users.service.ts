import { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from '../../shared/errors/http-error';
import { AdminUsersRepository } from './admin.users.repository';

export class AdminUsersService {
  constructor(
    private readonly repository: AdminUsersRepository,
    private readonly supabaseAdmin?: SupabaseClient,
  ) {}

  async criarUsuario(input: {
    tenantId: string;
    email?: string | null;
    nome: string;
    role?: string;
    senha?: string | null;
  }) {
    const role = input.role || 'operador';
    this.validateName(input.nome, 'Nome e obrigatorio.');
    this.validateRole(role);
    this.validateEmail(input.email);
    this.validatePassword(input.senha);

    const supabaseAdmin = this.requireSupabaseAdmin();
    let authUserId: string | null = null;

    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: input.email!,
        password: input.senha!,
        email_confirm: true,
        user_metadata: { name: input.nome },
        app_metadata: { tenant_id: input.tenantId, role },
      });

      if (error || !data.user) {
        throw new HttpError(400, error?.message || 'Erro ao criar usuario de autenticacao.');
      }

      authUserId = data.user.id;
      const usuario = await this.repository.createStaff({
        tenantId: input.tenantId,
        userId: data.user.id,
        nome: input.nome,
        role,
      });

      return {
        message: 'Usuario interno criado com acesso ao sistema.',
        usuario: {
          id: usuario.id,
          supabase_id: usuario.user_id,
          nome: usuario.name,
          email: input.email,
          role: usuario.role,
          ativo: usuario.is_active,
        },
      };
    } catch (error: any) {
      if (authUserId) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId, true).catch(() => {});
      }
      if (error instanceof HttpError) {
        throw error;
      }
      this.handleDbError(error, 'Erro interno do servidor ao criar usuario.');
    }
  }

  async listarUsuarios(tenantId: string) {
    return this.repository.listStaff(tenantId);
  }

  async atualizarUsuario(input: {
    id: string;
    tenantId: string;
    nome: string;
    role: string;
    email?: string | null;
  }) {
    this.validateName(input.nome, 'Nome e role sao obrigatorios.');
    this.validateEmail(input.email);
    if (!input.role) {
      throw new HttpError(400, 'Nome e role sao obrigatorios.');
    }
    this.validateRole(input.role);

    const supabaseAdmin = this.requireSupabaseAdmin();

    try {
      const usuario = await this.repository.updateStaff({
        id: input.id,
        tenantId: input.tenantId,
        nome: input.nome,
        role: input.role,
      });

      if (!usuario) {
        throw new HttpError(404, 'Funcionario nao encontrado.');
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(usuario.user_id, {
        email: input.email || undefined,
        user_metadata: { name: input.nome },
        app_metadata: { tenant_id: input.tenantId, role: input.role },
      });

      if (error) {
        throw new HttpError(400, error.message);
      }

      return { message: 'Usuario atualizado com sucesso.' };
    } catch (error: any) {
      if (error instanceof HttpError) {
        throw error;
      }
      this.handleDbError(error, 'Erro ao editar usuario.');
    }
  }

  async alterarStatus(input: { id: string; tenantId: string; ativo: boolean }) {
    const usuario = await this.repository.updateStaffStatus(input);
    if (!usuario) {
      throw new HttpError(404, 'Funcionario nao encontrado.');
    }

    const supabaseAdmin = this.requireSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(usuario.user_id, {
      ban_duration: input.ativo ? 'none' : '876000h',
    } as any);

    if (error) {
      throw new HttpError(400, error.message);
    }

    return { message: input.ativo ? 'Usuario desbloqueado.' : 'Usuario bloqueado.' };
  }

  async excluirUsuario(input: { id: string; tenantId: string }) {
    const usuario = await this.repository.deleteStaff(input);
    if (!usuario) {
      throw new HttpError(404, 'Funcionario nao encontrado.');
    }

    const supabaseAdmin = this.requireSupabaseAdmin();
    await supabaseAdmin.auth.admin.deleteUser(usuario.user_id, true).catch(async () => {
      await supabaseAdmin.auth.admin.updateUserById(usuario.user_id, {
        ban_duration: '876000h',
      } as any);
    });

    return { message: 'Usuario excluido com sucesso.' };
  }

  private validateName(nome: string, message: string) {
    if (!nome) {
      throw new HttpError(400, message);
    }
  }

  private validateEmail(email?: string | null) {
    if (!email || !email.includes('@')) {
      throw new HttpError(400, 'E-mail valido e obrigatorio.');
    }
  }

  private validatePassword(password?: string | null) {
    if (!password || password.length < 6) {
      throw new HttpError(400, 'Senha temporaria deve ter pelo menos 6 caracteres.');
    }
  }

  private validateRole(role: string) {
    if (role !== 'admin' && role !== 'operador') {
      throw new HttpError(400, 'Role invalida.');
    }
  }

  private requireSupabaseAdmin() {
    if (!this.supabaseAdmin) {
      throw new HttpError(500, 'Cliente administrativo de autenticacao nao configurado.');
    }

    return this.supabaseAdmin;
  }

  private handleDbError(error: any, fallbackMessage: string): never {
    if (error?.code === '23505') {
      throw new HttpError(409, 'Ja existe um usuario com este e-mail neste restaurante.');
    }

    throw new HttpError(500, fallbackMessage);
  }
}
