import { HttpError } from '../../shared/errors/http-error';
import { AdminUsersRepository } from './admin.users.repository';

export class AdminUsersService {
  constructor(private readonly repository: AdminUsersRepository) {}

  async criarUsuario(input: { tenantId: string; email?: string | null; nome: string; role?: string }) {
    const role = input.role || 'operador';
    this.validateName(input.nome, 'Nome Ã© obrigatÃ³rio.');
    this.validateRole(role);

    try {
      const usuario = await this.repository.createStaff({
        tenantId: input.tenantId,
        nome: input.nome,
        email: input.email,
        role,
      });

      return {
        message: 'Usuario interno criado com sucesso.',
        usuario: {
          id: usuario.id,
          nome: usuario.name,
          email: usuario.email,
          role: usuario.role,
          ativo: usuario.is_active,
        },
      };
    } catch (error: any) {
      this.handleDbError(error, 'Erro interno do servidor ao criar usuario.');
    }
  }

  async listarUsuarios(tenantId: string) {
    return this.repository.listStaff(tenantId);
  }

  async atualizarUsuario(input: { id: string; tenantId: string; nome: string; role: string; email?: string | null }) {
    this.validateName(input.nome, 'Nome e role sao obrigatorios.');
    if (!input.role) {
      throw new HttpError(400, 'Nome e role sao obrigatorios.');
    }
    this.validateRole(input.role);

    try {
      const usuario = await this.repository.updateStaff(input);
      if (!usuario) {
        throw new HttpError(404, 'Funcionario nao encontrado.');
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

    return { message: input.ativo ? 'Usuario desbloqueado.' : 'Usuario bloqueado.' };
  }

  async excluirUsuario(input: { id: string; tenantId: string }) {
    const usuario = await this.repository.deleteStaff(input);
    if (!usuario) {
      throw new HttpError(404, 'Funcionario nao encontrado.');
    }

    return { message: 'Usuario excluido com sucesso.' };
  }

  private validateName(nome: string, message: string) {
    if (!nome) {
      throw new HttpError(400, message);
    }
  }

  private validateRole(role: string) {
    if (role !== 'admin' && role !== 'operador') {
      throw new HttpError(400, 'Role invalida.');
    }
  }

  private handleDbError(error: any, fallbackMessage: string): never {
    if (error?.code === '23505') {
      throw new HttpError(409, 'JÃ¡ existe um usuÃ¡rio com este e-mail neste restaurante.');
    }

    throw new HttpError(500, fallbackMessage);
  }
}
