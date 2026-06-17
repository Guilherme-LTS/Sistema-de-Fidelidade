import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import app from '../src/app';
import { adminPool } from '../src/infra/database/db';

const shouldRunIntegration = process.env.INTEGRATION_TESTS === '1';
const integrationTest = shouldRunIntegration ? test : test.skip;

const hasDbConfig = Boolean(
  process.env.DATABASE_URL || process.env.APP_DATABASE_URL || process.env.DB_HOST,
);

const listen = async () => {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
};

const cleanupRegistration = async (tenantId: string | null, email: string, tenantName: string) => {
  const tenantIds = new Set<string>();
  if (tenantId) {
    tenantIds.add(tenantId);
  }

  const tenantRows = await adminPool.query('SELECT id::text FROM tenants WHERE name = $1', [tenantName]);
  tenantRows.rows.forEach((row) => tenantIds.add(row.id));

  const userRows = await adminPool.query('SELECT id::text FROM auth.users WHERE email = $1', [email]);
  userRows.rows.forEach((row) => tenantIds.add(row.id));

  const ids = [...tenantIds];

  if (ids.length > 0) {
    await adminPool.query('DELETE FROM audit_logs WHERE tenant_id = ANY($1::uuid[])', [ids]);
    await adminPool.query('DELETE FROM redemptions WHERE tenant_id = ANY($1::uuid[])', [ids]);
    await adminPool.query('DELETE FROM transactions WHERE tenant_id = ANY($1::uuid[])', [ids]);
    await adminPool.query('DELETE FROM rewards WHERE tenant_id = ANY($1::uuid[])', [ids]);
    await adminPool.query('DELETE FROM tenant_settings WHERE tenant_id = ANY($1::uuid[])', [ids]);
    await adminPool.query('DELETE FROM customers WHERE tenant_id = ANY($1::uuid[])', [ids]);
    await adminPool.query('DELETE FROM tenant_users WHERE tenant_id = ANY($1::uuid[])', [ids]);
    await adminPool.query('DELETE FROM tenants WHERE id = ANY($1::uuid[])', [ids]);
  }

  await adminPool.query('DELETE FROM auth.users WHERE email = $1', [email]);
};

integrationTest('integration: register-tenant cria tenant, admin, settings e metadata', async (t) => {
  if (!hasDbConfig) {
    t.skip('Banco nao configurado para testes de integracao.');
    return;
  }

  const timestamp = Date.now();
  const email = `codex-register-${timestamp}@example.com`;
  const tenantName = `Codex Register ${timestamp}`;
  let tenantId: string | null = null;
  const server = await listen();

  try {
    const response = await fetch(`${server.baseUrl}/auth/register-tenant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_name: tenantName,
        admin_name: 'Admin Registro',
        document: '12.345.678/0001-90',
        email,
        password: 'senha123',
      }),
    });

    const body = await response.json() as any;
    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.ok(body.tenant_id);
    tenantId = body.tenant_id;

    const tenant = await adminPool.query('SELECT name, document, is_active FROM tenants WHERE id = $1', [tenantId]);
    assert.equal(tenant.rows[0]?.name, tenantName);
    assert.equal(tenant.rows[0]?.document, '12345678000190');
    assert.equal(tenant.rows[0]?.is_active, true);

    const tenantUser = await adminPool.query(
      'SELECT name, role, is_active FROM tenant_users WHERE tenant_id = $1 AND user_id = $1',
      [tenantId],
    );
    assert.equal(tenantUser.rows[0]?.name, 'Admin Registro');
    assert.equal(tenantUser.rows[0]?.role, 'admin');
    assert.equal(tenantUser.rows[0]?.is_active, true);

    const settings = await adminPool.query(
      'SELECT setting_key, setting_value FROM tenant_settings WHERE tenant_id = $1 ORDER BY setting_key',
      [tenantId],
    );
    assert.deepEqual(settings.rows.map((row) => [row.setting_key, row.setting_value]), [
      ['carencia_pontos', 0],
      ['expiracao_pontos', 180],
    ]);

    const authUser = await adminPool.query(
      'SELECT raw_app_meta_data FROM auth.users WHERE id = $1 AND email = $2',
      [tenantId, email],
    );
    assert.equal(authUser.rows[0]?.raw_app_meta_data?.tenant_id, tenantId);
    assert.equal(authUser.rows[0]?.raw_app_meta_data?.role, 'admin');
  } finally {
    await server.close();
    await cleanupRegistration(tenantId, email, tenantName);
  }
});
