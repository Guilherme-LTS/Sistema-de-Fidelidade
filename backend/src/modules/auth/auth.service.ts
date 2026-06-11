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
    if (!input.email || !input.password || !input.tenantName) {
      throw new HttpError(400, 'Faltam campos obrigatÃ³rios (tenant_name, email, password).');
    }

    const authUser = await this.repository.createAuthUser({
      email: input.email,
      password: input.password,
    });

    const tenantId = authUser.id;
    await this.repository.createTenant({
      tenantId,
      tenantName: input.tenantName,
      document: input.document,
    });
    await this.repository.createTenantAdmin({
      userId: authUser.id,
      tenantId,
      adminName: input.adminName,
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
  }
}
