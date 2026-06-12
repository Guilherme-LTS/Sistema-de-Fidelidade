import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import app from '../src/app';
import { adminPool } from '../src/infra/database/db';

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
  rewardId: string | number;
};

type PublicFixture = {
  document: string;
  consumerProfileId: string;
  tenantA: TenantFixture;
  tenantB: TenantFixture;
};

const listen = async () => {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
};

const createTenantFixture = async (
  document: string,
  consumerProfileId: string,
  name: string,
  points: number,
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
      `${tenantId}@example.com`,
      JSON.stringify({ tenant_id: tenantId, role: 'admin' }),
      JSON.stringify({ name: 'Admin Public Test' }),
    ],
  );

  await adminPool.query(
    'INSERT INTO tenants (id, name, document, is_active) VALUES ($1, $2, $3, true)',
    [tenantId, name, `${document}-${name}`],
  );

  await adminPool.query(
    'INSERT INTO tenant_users (id, user_id, tenant_id, name, role, is_active) VALUES ($1, $2, $3, $4, $5, true)',
    [tenantUserId, userId, tenantId, 'Admin Public Test', 'admin'],
  );

  const customerResult = await adminPool.query(
    `
      INSERT INTO customers (tenant_id, consumer_profile_id, document, name, lgpd_consent, consent_date)
      VALUES ($1, $2, $3, $4, true, NOW())
      RETURNING id
    `,
    [tenantId, consumerProfileId, document, `Cliente ${name}`],
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
        tenant_id
      )
      VALUES ($1, $2, $3, $3, NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', $4, $5)
    `,
    [customerId, points, points, tenantUserId, tenantId],
  );

  const rewardResult = await adminPool.query(
    `
      INSERT INTO rewards (tenant_id, name, description, points_cost, is_active)
      VALUES
        ($1, $2, 'Ativa', 10, true),
        ($1, $3, 'Inativa', 20, false)
      RETURNING id, name
    `,
    [tenantId, `Recompensa ${name}`, `Inativa ${name}`],
  );

  return {
    tenantId,
    userId,
    tenantUserId,
    customerId,
    rewardId: rewardResult.rows[0].id,
  };
};

const setupFixture = async (): Promise<PublicFixture> => {
  const document = `9${Date.now().toString().slice(-10)}`;
  const profileResult = await adminPool.query(
    `
      INSERT INTO consumer_profiles (document, name, lgpd_consent, consent_date)
      VALUES ($1, 'Cliente Publico', true, NOW())
      RETURNING id
    `,
    [document],
  );
  const consumerProfileId = profileResult.rows[0].id;

  const tenantA = await createTenantFixture(document, consumerProfileId, 'Public Tenant A', 120);
  const tenantB = await createTenantFixture(document, consumerProfileId, 'Public Tenant B', 300);

  return { document, consumerProfileId, tenantA, tenantB };
};

const cleanupFixture = async (fixture: PublicFixture) => {
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

integrationTest('integration: public endpoints require tenant scope and isolate balances', async (t) => {
  if (!hasDbConfig) {
    t.skip('Banco nao configurado para testes de integracao.');
    return;
  }

  const fixture = await setupFixture();
  const server = await listen();

  try {
    const unscopedResponse = await fetch(`${server.baseUrl}/public/pontos/${fixture.document}`);
    assert.equal(unscopedResponse.status, 400);

    const tenantAResponse = await fetch(
      `${server.baseUrl}/public/pontos/${fixture.document}?tenant_id=${fixture.tenantA.tenantId}`,
    );
    assert.equal(tenantAResponse.status, 200);
    const tenantABody = await tenantAResponse.json() as any;
    assert.equal(tenantABody.saldos.length, 1);
    assert.equal(tenantABody.saldos[0].tenant_id, fixture.tenantA.tenantId);
    assert.equal(tenantABody.saldos[0].pontos_disponiveis, 120);

    const tenantBResponse = await fetch(
      `${server.baseUrl}/public/pontos/${fixture.document}?tenant_id=${fixture.tenantB.tenantId}`,
    );
    assert.equal(tenantBResponse.status, 200);
    const tenantBBody = await tenantBResponse.json() as any;
    assert.equal(tenantBBody.saldos.length, 1);
    assert.equal(tenantBBody.saldos[0].tenant_id, fixture.tenantB.tenantId);
    assert.equal(tenantBBody.saldos[0].pontos_disponiveis, 300);
  } finally {
    await server.close();
    await cleanupFixture(fixture);
  }
});

integrationTest('integration: public rewards expose only active rewards from requested tenant', async (t) => {
  if (!hasDbConfig) {
    t.skip('Banco nao configurado para testes de integracao.');
    return;
  }

  const fixture = await setupFixture();
  const server = await listen();

  try {
    const response = await fetch(`${server.baseUrl}/recompensas/publica/${fixture.tenantA.tenantId}`);
    assert.equal(response.status, 200);
    const body = await response.json() as any;

    assert.equal(body.rewards.length, 1);
    assert.equal(body.rewards[0].name, 'Recompensa Public Tenant A');
    assert.equal(body.rewards[0].points_cost, 10);
  } finally {
    await server.close();
    await cleanupFixture(fixture);
  }
});
