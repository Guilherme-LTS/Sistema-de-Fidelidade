import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { adminPool } from '../src/infra/database/db';
import { AuthenticatedRequest, withRlsTransaction } from '../src/infra/database/db-rls';
import { ClientesRepository } from '../src/modules/clientes/clientes.repository';
import { ClientesService } from '../src/modules/clientes/clientes.service';
import { TransacoesRepository } from '../src/modules/transacoes/transacoes.repository';
import { TransacoesService } from '../src/modules/transacoes/transacoes.service';

const shouldRunIntegration = process.env.INTEGRATION_TESTS === '1';
const integrationTest = shouldRunIntegration ? test : test.skip;

const hasDbConfig = Boolean(
  process.env.DATABASE_URL || process.env.APP_DATABASE_URL || process.env.DB_HOST,
);

type TenantContext = {
  tenantId: string;
  userId: string;
  tenantUserId: string;
  name: string;
};

const generateCpf = () => {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 9));
  const calcDigit = (items: number[], factor: number) => {
    const total = items.reduce((acc, item, index) => acc + item * (factor - index), 0);
    const mod = total % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const d1 = calcDigit(digits, 10);
  const d2 = calcDigit([...digits, d1], 11);
  return [...digits, d1, d2].join('');
};

const makeAuthRequest = (ctx: TenantContext): AuthenticatedRequest => {
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
      nome: ctx.name,
      email: `${ctx.userId}@example.com`,
      role: 'admin',
      tenant_id: ctx.tenantId,
    },
  } as AuthenticatedRequest;
};

const setupTenant = async (name: string): Promise<TenantContext> => {
  const tenantId = randomUUID();
  const userId = randomUUID();
  const tenantUserId = randomUUID();
  const email = `tenant-${userId}@example.com`;

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
      JSON.stringify({ name }),
    ],
  );

  await adminPool.query(
    'INSERT INTO tenants (id, name, document, is_active) VALUES ($1, $2, $3, true)',
    [tenantId, name, `${Date.now()}${Math.floor(Math.random() * 100000)}`],
  );

  await adminPool.query(
    'INSERT INTO tenant_users (id, user_id, tenant_id, name, role, is_active) VALUES ($1, $2, $3, $4, $5, true)',
    [tenantUserId, userId, tenantId, name, 'admin'],
  );

  await adminPool.query(
    `
      INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_unit, updated_at)
      VALUES
        ($1, 'carencia_pontos', 0, 'dias', NOW()),
        ($1, 'expiracao_pontos', 180, 'dias', NOW())
    `,
    [tenantId],
  );

  return { tenantId, userId, tenantUserId, name };
};

const cleanupTenants = async (contexts: TenantContext[], document: string) => {
  for (const ctx of contexts) {
    await adminPool.query('DELETE FROM redemptions WHERE tenant_id = $1', [ctx.tenantId]);
    await adminPool.query('DELETE FROM transactions WHERE tenant_id = $1', [ctx.tenantId]);
    await adminPool.query('DELETE FROM rewards WHERE tenant_id = $1', [ctx.tenantId]);
    await adminPool.query('DELETE FROM customers WHERE tenant_id = $1', [ctx.tenantId]);
    await adminPool.query('DELETE FROM tenant_users WHERE tenant_id = $1', [ctx.tenantId]);
    await adminPool.query('DELETE FROM tenant_settings WHERE tenant_id = $1', [ctx.tenantId]);
    await adminPool.query('DELETE FROM tenants WHERE id = $1', [ctx.tenantId]);
    await adminPool.query('DELETE FROM auth.users WHERE id = $1', [ctx.userId]);
  }

  await adminPool.query(
    `
      DELETE FROM consumer_profiles
      WHERE document = $1
        AND NOT EXISTS (
          SELECT 1 FROM customers c WHERE c.consumer_profile_id = consumer_profiles.id
        )
    `,
    [document],
  );
};

integrationTest('integration: mesmo CPF pode existir em dois tenants sem vazamento de saldo', async (t) => {
  if (!hasDbConfig) {
    t.skip('Banco nao configurado para testes de integracao.');
    return;
  }

  const tenantA = await setupTenant('Restaurante Multi Tenant A');
  const tenantB = await setupTenant('Restaurante Multi Tenant B');
  const document = generateCpf();

  try {
    const authReqA = makeAuthRequest(tenantA);
    const authReqB = makeAuthRequest(tenantB);

    await withRlsTransaction(authReqA, async (client) => {
      const clientesService = new ClientesService(new ClientesRepository(authReqA, client));
      const transacoesService = new TransacoesService(new TransacoesRepository(client));

      await clientesService.cadastrarCliente({
        tenantId: tenantA.tenantId,
        nome: 'Cliente Restaurante A',
        document,
        lgpdConsentimento: true,
      });

      await transacoesService.lancarPontos({
        tenantId: tenantA.tenantId,
        document,
        nome: 'Cliente Restaurante A',
        valor: 100,
        operadorId: tenantA.tenantUserId,
        req: authReqA,
      });
    });

    await withRlsTransaction(authReqB, async (client) => {
      const clientesService = new ClientesService(new ClientesRepository(authReqB, client));
      const transacoesService = new TransacoesService(new TransacoesRepository(client));

      await clientesService.cadastrarCliente({
        tenantId: tenantB.tenantId,
        nome: 'Cliente Restaurante B',
        document,
        lgpdConsentimento: true,
      });

      await transacoesService.lancarPontos({
        tenantId: tenantB.tenantId,
        document,
        nome: 'Cliente Restaurante B',
        valor: 250,
        operadorId: tenantB.tenantUserId,
        req: authReqB,
      });
    });

    const serviceA = new ClientesService(new ClientesRepository(authReqA));
    const serviceB = new ClientesService(new ClientesRepository(authReqB));

    const saldoA = await serviceA.consultarSaldo({ tenantId: tenantA.tenantId, document });
    const saldoB = await serviceB.consultarSaldo({ tenantId: tenantB.tenantId, document });

    assert.equal(saldoA.nome, 'Cliente Restaurante A');
    assert.equal(saldoA.pontosDisponiveis, 100);
    assert.equal(saldoB.nome, 'Cliente Restaurante B');
    assert.equal(saldoB.pontosDisponiveis, 250);

    await assert.rejects(
      () => serviceA.consultarSaldo({ tenantId: tenantB.tenantId, document }),
      /Cliente/,
    );

    const customerRows = await adminPool.query(
      'SELECT tenant_id, document, name, consumer_profile_id FROM customers WHERE document = $1 ORDER BY tenant_id',
      [document],
    );
    assert.equal(customerRows.rows.length, 2);
    assert.equal(customerRows.rows[0].consumer_profile_id, customerRows.rows[1].consumer_profile_id);
  } finally {
    await cleanupTenants([tenantA, tenantB], document);
  }
});
