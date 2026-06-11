import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { adminPool } from '../src/infra/database/db';
import { AuthenticatedRequest, withRlsTransaction } from '../src/infra/database/db-rls';
import { logAuditEvent } from '../src/shared/auditoria/audit';
import { AdminUsersRepository } from '../src/modules/admin/admin.users.repository';
import { AdminUsersService } from '../src/modules/admin/admin.users.service';
import { RecompensasRepository } from '../src/modules/recompensas/recompensas.repository';
import { RecompensasService } from '../src/modules/recompensas/recompensas.service';

const shouldRunIntegration = process.env.INTEGRATION_TESTS === '1';
const integrationTest = shouldRunIntegration ? test : test.skip;

const hasDbConfig = Boolean(
  process.env.DATABASE_URL || process.env.APP_DATABASE_URL || process.env.DB_HOST,
);

type IntegrationContext = {
  tenantId: string;
  userId: string;
  tenantUserId: string;
  document: string;
};

const makeDocument = () => `${Date.now()}${Math.floor(Math.random() * 100000)}`.slice(0, 14);

const makeAuthRequest = (ctx: IntegrationContext): AuthenticatedRequest => {
  return {
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
    user: {
      id: ctx.userId,
      tenant_id: ctx.tenantId,
      role: 'admin',
    },
    usuario: {
      id: ctx.tenantUserId,
      user_id: ctx.userId,
      nome: 'Admin Teste',
      email: `admin-${ctx.userId}@example.com`,
      role: 'admin',
      tenant_id: ctx.tenantId,
    },
  } as AuthenticatedRequest;
};

const setupContext = async (): Promise<IntegrationContext> => {
  const tenantId = randomUUID();
  const userId = randomUUID();
  const tenantUserId = randomUUID();
  const document = makeDocument();
  const email = `admin-${userId}@example.com`;

  await adminPool.query(
    `
      INSERT INTO auth.users (
        id,
        aud,
        role,
        email,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        is_sso_user,
        is_anonymous
      )
      VALUES ($1, 'authenticated', 'authenticated', $2, NOW(), $3, $4, NOW(), NOW(), false, false)
    `,
    [
      userId,
      email,
      JSON.stringify({ tenant_id: tenantId, role: 'admin' }),
      JSON.stringify({ name: 'Admin Teste' }),
    ],
  );

  await adminPool.query(
    'INSERT INTO tenants (id, name, document, is_active) VALUES ($1, $2, $3, true)',
    [tenantId, 'Tenant Admin Teste', document],
  );

  await adminPool.query(
    'INSERT INTO tenant_users (id, user_id, tenant_id, name, role, is_active) VALUES ($1, $2, $3, $4, $5, true)',
    [tenantUserId, userId, tenantId, 'Admin Teste', 'admin'],
  );

  return { tenantId, userId, tenantUserId, document };
};

const cleanupContext = async (ctx: IntegrationContext) => {
  await adminPool.query('DELETE FROM audit_logs WHERE tenant_id = $1', [ctx.tenantId]);
  await adminPool.query('DELETE FROM tenant_staff WHERE tenant_id = $1', [ctx.tenantId]);
  await adminPool.query('DELETE FROM tenant_settings WHERE tenant_id = $1', [ctx.tenantId]);
  await adminPool.query('DELETE FROM rewards WHERE tenant_id = $1', [ctx.tenantId]);
  await adminPool.query('DELETE FROM tenant_users WHERE tenant_id = $1', [ctx.tenantId]);
  await adminPool.query('DELETE FROM tenants WHERE id = $1', [ctx.tenantId]);
  await adminPool.query('DELETE FROM auth.users WHERE id = $1', [ctx.userId]);
};

integrationTest('integration: admin writes preserve RLS context', async (t) => {
  if (!hasDbConfig) {
    t.skip('Banco nao configurado para testes de integracao.');
    return;
  }

  const ctx = await setupContext();

  try {
    const authReq = makeAuthRequest(ctx);

    const recompensa = await withRlsTransaction(authReq, async (client) => {
      const service = new RecompensasService(new RecompensasRepository(authReq, client));
      return service.criar({
        tenantId: ctx.tenantId,
        nome: 'Cafe cortesia',
        descricao: 'Bebida de teste',
        custoPontos: 100,
        operatorId: ctx.tenantUserId,
        req: authReq,
      });
    });

    assert.ok(recompensa.id, 'recompensa deve ser criada');

    const rewardAudit = await adminPool.query(
      'SELECT action FROM audit_logs WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3',
      [ctx.tenantId, 'reward', String(recompensa.id)],
    );
    assert.equal(rewardAudit.rows[0]?.action, 'CRIACAO_RECOMPENSA');

    const usuarioInterno = await withRlsTransaction(authReq, async (client) => {
      const service = new AdminUsersService(new AdminUsersRepository(authReq, client));
      return service.criarUsuario({
        tenantId: ctx.tenantId,
        nome: 'Operador Novo',
        email: `operador-${ctx.userId}@example.com`,
        role: 'operador',
      });
    });

    assert.ok(usuarioInterno?.usuario.id, 'usuario interno deve ser criado');

    await withRlsTransaction(authReq, async (client) => {
      await client.query(`
        INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_unit, updated_at)
        VALUES ($1, 'carencia_pontos', $2, 'dias', NOW())
        ON CONFLICT (tenant_id, setting_key)
        DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
      `, [ctx.tenantId, 3]);

      await client.query(`
        INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_unit, updated_at)
        VALUES ($1, 'expiracao_pontos', $2, 'dias', NOW())
        ON CONFLICT (tenant_id, setting_key)
        DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
      `, [ctx.tenantId, 90]);

      await logAuditEvent({
        req: authReq,
        client,
        tenantId: ctx.tenantId,
        operatorId: ctx.tenantUserId,
        action: 'ALTERACAO_CONFIGURACOES',
        details: 'Configuracoes alteradas em teste.',
        targetLabel: 'Regras de Pontos',
        impactLabel: 'Carencia 3d / Expiracao 90d',
        status: 'SUCESSO',
        entityType: 'tenant_settings',
      });
    });

    const settings = await adminPool.query(
      'SELECT setting_key, setting_value FROM tenant_settings WHERE tenant_id = $1 ORDER BY setting_key ASC',
      [ctx.tenantId],
    );
    assert.deepEqual(
      settings.rows.map((row) => [row.setting_key, row.setting_value]),
      [
        ['carencia_pontos', 3],
        ['expiracao_pontos', 90],
      ],
    );

    const settingsAudit = await adminPool.query(
      'SELECT action FROM audit_logs WHERE tenant_id = $1 AND entity_type = $2',
      [ctx.tenantId, 'tenant_settings'],
    );
    assert.equal(settingsAudit.rows[0]?.action, 'ALTERACAO_CONFIGURACOES');
  } finally {
    await cleanupContext(ctx);
  }
});
