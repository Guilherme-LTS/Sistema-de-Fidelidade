import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { adminPool } from '../src/infra/database/db';
import { AuthenticatedRequest } from '../src/infra/database/db-rls';
import { DashboardRepository } from '../src/modules/dashboard/dashboard.repository';
import { DashboardService } from '../src/modules/dashboard/dashboard.service';

const shouldRunIntegration = process.env.INTEGRATION_TESTS === '1';
const integrationTest = shouldRunIntegration ? test : test.skip;

const hasDbConfig = Boolean(
  process.env.DATABASE_URL || process.env.APP_DATABASE_URL || process.env.DB_HOST,
);

type TenantFixture = {
  tenantId: string;
  userId: string;
  tenantUserId: string;
  customerId: string;
};

type DashboardFixture = {
  consumerProfileId: string;
  tenantA: TenantFixture;
  tenantB: TenantFixture;
};

const makeDocument = () => `8${Date.now().toString().slice(-10)}`;

const makeAuthRequest = (tenant: TenantFixture): AuthenticatedRequest => ({
  user: {
    id: tenant.userId,
    tenant_id: tenant.tenantId,
    role: 'admin',
  },
  usuario: {
    id: tenant.tenantUserId,
    user_id: tenant.userId,
    nome: 'Admin Dashboard Test',
    email: `dashboard-${tenant.userId}@example.com`,
    role: 'admin',
    tenant_id: tenant.tenantId,
  },
} as AuthenticatedRequest);

const createTenantFixture = async (
  consumerProfileId: string,
  document: string,
  tenantName: string,
  availablePoints: number,
  pendingPoints: number,
  redeemedPoints: number,
): Promise<TenantFixture> => {
  const tenantId = randomUUID();
  const userId = randomUUID();
  const tenantUserId = randomUUID();

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
      `dashboard-${userId}@example.com`,
      JSON.stringify({ tenant_id: tenantId, role: 'admin' }),
      JSON.stringify({ name: 'Admin Dashboard Test' }),
    ],
  );

  await adminPool.query(
    'INSERT INTO tenants (id, name, document, is_active) VALUES ($1, $2, $3, true)',
    [tenantId, tenantName, `${document}-${tenantName}`],
  );

  await adminPool.query(
    'INSERT INTO tenant_users (id, user_id, tenant_id, name, role, is_active) VALUES ($1, $2, $3, $4, $5, true)',
    [tenantUserId, userId, tenantId, 'Admin Dashboard Test', 'admin'],
  );

  const customerResult = await adminPool.query(
    `
      INSERT INTO customers (tenant_id, consumer_profile_id, document, name, lgpd_consent, consent_date)
      VALUES ($1, $2, $3, $4, true, NOW())
      RETURNING id
    `,
    [tenantId, consumerProfileId, document, `Cliente ${tenantName}`],
  );
  const customerId = customerResult.rows[0].id;

  await adminPool.query(
    `
      INSERT INTO transactions (
        customer_id,
        amount_spent,
        points_earned,
        remaining_points,
        available_at,
        expires_at,
        operator_id,
        tenant_id,
        created_at
      )
      VALUES
        ($1, $2::numeric, $2::integer, $2::integer, NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', $3, $4, NOW() - INTERVAL '1 hour'),
        ($1, $5::numeric, $5::integer, $5::integer, NOW() + INTERVAL '1 day', NOW() + INTERVAL '30 days', $3, $4, NOW() - INTERVAL '1 hour')
    `,
    [customerId, availablePoints, tenantUserId, tenantId, pendingPoints],
  );

  const rewardResult = await adminPool.query(
    'INSERT INTO rewards (tenant_id, name, points_cost, is_active) VALUES ($1, $2, $3, true) RETURNING id',
    [tenantId, `Reward ${tenantName}`, redeemedPoints],
  );

  await adminPool.query(
    `
      INSERT INTO redemptions (customer_id, reward_id, points_spent, operator_id, tenant_id, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '30 minutes')
    `,
    [customerId, rewardResult.rows[0].id, redeemedPoints, tenantUserId, tenantId],
  );

  return { tenantId, userId, tenantUserId, customerId };
};

const setupFixture = async (): Promise<DashboardFixture> => {
  const document = makeDocument();
  const profileResult = await adminPool.query(
    `
      INSERT INTO consumer_profiles (document, name, lgpd_consent, consent_date)
      VALUES ($1, 'Cliente Dashboard Test', true, NOW())
      RETURNING id
    `,
    [document],
  );
  const consumerProfileId = profileResult.rows[0].id;

  const tenantA = await createTenantFixture(consumerProfileId, document, 'Dashboard Tenant A', 100, 40, 25);
  const tenantB = await createTenantFixture(consumerProfileId, document, 'Dashboard Tenant B', 300, 80, 60);

  return { consumerProfileId, tenantA, tenantB };
};

const cleanupFixture = async (fixture: DashboardFixture) => {
  const tenantIds = [fixture.tenantA.tenantId, fixture.tenantB.tenantId];
  const userIds = [fixture.tenantA.userId, fixture.tenantB.userId];

  await adminPool.query('DELETE FROM redemptions WHERE tenant_id = ANY($1::uuid[])', [tenantIds]);
  await adminPool.query('DELETE FROM transactions WHERE tenant_id = ANY($1::uuid[])', [tenantIds]);
  await adminPool.query('DELETE FROM rewards WHERE tenant_id = ANY($1::uuid[])', [tenantIds]);
  await adminPool.query('DELETE FROM customers WHERE tenant_id = ANY($1::uuid[])', [tenantIds]);
  await adminPool.query('DELETE FROM consumer_profiles WHERE id = $1', [fixture.consumerProfileId]);
  await adminPool.query('DELETE FROM tenant_users WHERE tenant_id = ANY($1::uuid[])', [tenantIds]);
  await adminPool.query('DELETE FROM tenants WHERE id = ANY($1::uuid[])', [tenantIds]);
  await adminPool.query('DELETE FROM auth.users WHERE id = ANY($1::uuid[])', [userIds]);
};

integrationTest('integration: dashboard metrics and chart are isolated by tenant', async (t) => {
  if (!hasDbConfig) {
    t.skip('Banco nao configurado para testes de integracao.');
    return;
  }

  const fixture = await setupFixture();

  try {
    const tenantAService = new DashboardService(new DashboardRepository(makeAuthRequest(fixture.tenantA)));
    const tenantBService = new DashboardService(new DashboardRepository(makeAuthRequest(fixture.tenantB)));

    const tenantAStats = await tenantAService.getStats(fixture.tenantA.tenantId);
    const tenantBStats = await tenantBService.getStats(fixture.tenantB.tenantId);

    assert.equal(tenantAStats.totalClientes, 1);
    assert.equal(tenantAStats.pontosDisponiveis, 100);
    assert.equal(tenantAStats.pontosPendentes, 40);
    assert.equal(tenantAStats.pontosResgatados, 25);
    assert.equal(tenantAStats.recentes[0]?.saldo_pontos, '100');
    assert.ok(tenantAStats.chartData.some((point) => point.resgates === 25));

    assert.equal(tenantBStats.totalClientes, 1);
    assert.equal(tenantBStats.pontosDisponiveis, 300);
    assert.equal(tenantBStats.pontosPendentes, 80);
    assert.equal(tenantBStats.pontosResgatados, 60);
    assert.equal(tenantBStats.recentes[0]?.saldo_pontos, '300');
    assert.ok(tenantBStats.chartData.some((point) => point.resgates === 60));
  } finally {
    await cleanupFixture(fixture);
  }
});
