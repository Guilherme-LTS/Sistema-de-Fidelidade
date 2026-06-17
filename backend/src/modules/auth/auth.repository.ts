import { SupabaseClient } from '@supabase/supabase-js';
import { PoolClient } from 'pg';
import { HttpError } from '../../shared/errors/http-error';

export class AuthRepository {
  constructor(
    private readonly client: PoolClient,
    private readonly supabaseAdmin: SupabaseClient,
  ) {}

  async createAuthUser(input: { email: string; password: string }) {
    const { data, error } = await this.supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });

    if (error || !data.user) {
      const message = error?.message || 'Erro ao criar conta de autenticacao.';
      const normalizedMessage = message.toLowerCase();

      if (normalizedMessage.includes('already') || normalizedMessage.includes('registered')) {
        throw new HttpError(409, 'Ja existe uma conta cadastrada com este e-mail.');
      }

      throw new HttpError(400, message);
    }

    return data.user;
  }

  async deleteAuthUser(userId: string) {
    await this.supabaseAdmin.auth.admin.deleteUser(userId, true);
  }

  async createTenant(input: { tenantId: string; tenantName: string; document?: string | null }) {
    await this.client.query(
      'INSERT INTO tenants (id, name, document, is_active) VALUES ($1, $2, $3, true)',
      [input.tenantId, input.tenantName, input.document || null],
    );
  }

  async createTenantAdmin(input: { userId: string; tenantId: string; adminName?: string | null }) {
    await this.client.query(
      'INSERT INTO tenant_users (user_id, tenant_id, name, role, is_active) VALUES ($1, $2, $3, $4, true)',
      [input.userId, input.tenantId, input.adminName || 'Gestor(a)', 'admin'],
    );
  }

  async seedTenantSettings(input: { tenantId: string; carenciaPontos: number; expiracaoPontos: number }) {
    await this.client.query(
      `
        INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_unit, updated_at)
        VALUES
          ($1, 'carencia_pontos', $2, 'dias', NOW()),
          ($1, 'expiracao_pontos', $3, 'dias', NOW())
        ON CONFLICT (tenant_id, setting_key)
        DO UPDATE SET setting_value = EXCLUDED.setting_value, setting_unit = EXCLUDED.setting_unit, updated_at = NOW()
      `,
      [input.tenantId, input.carenciaPontos, input.expiracaoPontos],
    );
  }

  async updateAuthUserMetadata(input: { userId: string; tenantId: string; role: string }) {
    const { error } = await this.supabaseAdmin.auth.admin.updateUserById(input.userId, {
      app_metadata: { tenant_id: input.tenantId, role: input.role },
    });

    if (error) {
      throw new HttpError(400, error.message);
    }
  }
}
