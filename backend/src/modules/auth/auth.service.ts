import { HttpError } from '../../shared/errors/http-error';
import { AuthRepository } from './auth.repository';

const DEFAULT_CARENCIA_PONTOS = 0;
const DEFAULT_EXPIRACAO_PONTOS = 180;

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  async registerTenant(input: {
    tenantName: string;
    document?: string | null;
    email: string;
    password: string;
    adminName?: string | null;
  }) {
    const tenantName = input.tenantName?.trim();
    const email = input.email?.trim().toLowerCase();
    const adminName = input.adminName?.trim();
    const document = input.document?.replace(/\D/g, '') || null;

    if (!email || !input.password || !tenantName) {
      throw new HttpError(400, 'Faltam campos obrigatorios (tenant_name, email, password).');
    }

    if (!email.includes('@')) {
      throw new HttpError(400, 'E-mail valido e obrigatorio.');
    }

    if (input.password.length < 6) {
      throw new HttpError(400, 'Senha deve ter pelo menos 6 caracteres.');
    }

    let authUserId: string | null = null;

    try {
      const authUser = await this.repository.createAuthUser({
        email,
        password: input.password,
      });
      authUserId = authUser.id;

      const tenantId = authUser.id;
      await this.repository.createTenant({
        tenantId,
        tenantName,
        document,
      });
      await this.repository.createTenantAdmin({
        userId: authUser.id,
        tenantId,
        adminName,
      });
      await this.repository.seedTenantSettings({
        tenantId,
        carenciaPontos: DEFAULT_CARENCIA_PONTOS,
        expiracaoPontos: DEFAULT_EXPIRACAO_PONTOS,
      });
      await this.repository.updateAuthUserMetadata({
        userId: authUser.id,
        tenantId,
        role: 'admin',
      });

      return {
        success: true,
        message: 'Restaurante cadastrado com sucesso!',
        tenant_id: tenantId,
      };
    } catch (error: any) {
      if (authUserId) {
        await this.repository.deleteAuthUser(authUserId).catch(() => {});
      }

      if (error instanceof HttpError) {
        throw error;
      }

      if (error?.code === '23505') {
        throw new HttpError(409, 'Ja existe um cadastro com estes dados.');
      }

      throw error;
    }
  }
}
