import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { adminPool } from '../src/infra/database/db';
import { AuthenticatedRequest, withRlsTransaction } from '../src/infra/database/db-rls';
import { upsertTenantCustomerByDocument, resolveTenantCustomerByDocument } from '../src/shared/customers/customer-identity';
import {
  buildFifoDebitUpdates,
  buildFifoUpdateQuery,
  calculatePointTimelines,
  loadTenantPointSettings,
} from '../src/shared/pontos/pontos-service';

const shouldRunIntegration = process.env.INTEGRATION_TESTS === '1';
const integrationTest = shouldRunIntegration ? test : test.skip;

const hasDbConfig = Boolean(
  process.env.DATABASE_URL || process.env.APP_DATABASE_URL || process.env.DB_HOST,
);

const makeAuthRequest = (tenantId: string, userId: string, tenantUserId: string): AuthenticatedRequest => {
  return {
    user: {
      id: userId,
      tenant_id: tenantId,
      role: 'admin',
    },
    usuario: {
      id: tenantUserId,
      user_id: userId,
      nome: 'Operador Teste',
      email: 'teste@example.com',
      role: 'admin',
      tenant_id: tenantId,
    },
  } as AuthenticatedRequest;
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

type IntegrationContext = {
  tenantId: string;
  userId: string;
  tenantUserId: string;
  rewardId: string | number;
  document: string;
};

const setupContext = async (): Promise<IntegrationContext> => {
  const tenantId = randomUUID();
  const userId = randomUUID();
  const tenantUserId = randomUUID();
  const document = generateCpf();
  const email = `integration-${userId}@example.com`;

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
      JSON.stringify({ name: 'Operador Teste' }),
    ],
  );

  await adminPool.query(
    'INSERT INTO tenants (id, name, document, is_active) VALUES ($1, $2, $3, true)',
    [tenantId, 'Tenant Teste', document],
  );

  await adminPool.query(
    'INSERT INTO tenant_users (id, user_id, tenant_id, name, role, is_active) VALUES ($1, $2, $3, $4, $5, true)',
    [tenantUserId, userId, tenantId, 'Operador Teste', 'admin'],
  );

  await adminPool.query(
    `
      INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_unit, updated_at)
      VALUES
        ($1, 'carencia_pontos', 0, 'dias', NOW()),
        ($1, 'expiracao_pontos', 180, 'dias', NOW())
      ON CONFLICT (tenant_id, setting_key)
      DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
    `,
    [tenantId],
  );

  const rewardResult = await adminPool.query(
    'INSERT INTO rewards (tenant_id, name, points_cost, is_active) VALUES ($1, $2, $3, true) RETURNING id',
    [tenantId, 'Recompensa Teste', 50],
  );
  const rewardId = rewardResult.rows[0].id;

  return { tenantId, userId, tenantUserId, rewardId, document };
};

const cleanupContext = async (ctx: IntegrationContext, customerId?: string, consumerProfileId?: string) => {
  await adminPool.query('DELETE FROM redemptions WHERE tenant_id = $1', [ctx.tenantId]);
  await adminPool.query('DELETE FROM transactions WHERE tenant_id = $1', [ctx.tenantId]);
  await adminPool.query('DELETE FROM rewards WHERE tenant_id = $1', [ctx.tenantId]);
  if (customerId) {
    await adminPool.query('DELETE FROM customers WHERE id = $1', [customerId]);
  } else {
    await adminPool.query('DELETE FROM customers WHERE tenant_id = $1', [ctx.tenantId]);
  }
  if (consumerProfileId) {
    await adminPool.query('DELETE FROM consumer_profiles WHERE id = $1', [consumerProfileId]);
  }
  await adminPool.query('DELETE FROM tenant_users WHERE tenant_id = $1', [ctx.tenantId]);
  await adminPool.query('DELETE FROM tenant_settings WHERE tenant_id = $1', [ctx.tenantId]);
  await adminPool.query('DELETE FROM tenants WHERE id = $1', [ctx.tenantId]);
  await adminPool.query('DELETE FROM auth.users WHERE id = $1', [ctx.userId]);
};

integrationTest('integration: transacoes e resgates', async (t) => {
  if (!hasDbConfig) {
    t.skip('Banco nao configurado para testes de integracao.');
    return;
  }

  const ctx = await setupContext();
  let customerId: string | undefined;
  let consumerProfileId: string | undefined;
  let transactionId: string | undefined;
  let redemptionId: string | undefined;

  try {
    const authReq = makeAuthRequest(ctx.tenantId, ctx.userId, ctx.tenantUserId);

    const transacao = await withRlsTransaction(authReq, async (client) => {
      const configs = await loadTenantPointSettings(client, ctx.tenantId);
      const { availableAt, expiresAt } = calculatePointTimelines(
        configs.carencia_pontos,
        configs.expiracao_pontos,
      );
      const cliente = await upsertTenantCustomerByDocument(client, {
        tenantId: ctx.tenantId,
        document: ctx.document,
        name: 'Cliente Teste',
        lgpdConsent: false,
        consentDate: null,
      });

      const insertResult = await client.query(
        `INSERT INTO transactions (customer_id, amount_spent, points_earned, remaining_points, available_at, expires_at, operator_id, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [cliente.id, 120, 120, 120, availableAt, expiresAt, ctx.tenantUserId, ctx.tenantId],
      );

      return {
        customerId: cliente.id,
        consumerProfileId: cliente.consumer_profile_id,
        transactionId: insertResult.rows[0]?.id,
      };
    });

    customerId = transacao.customerId;
    consumerProfileId = transacao.consumerProfileId ?? undefined;
    transactionId = transacao.transactionId;

    assert.ok(transactionId, 'transacao deve ser criada');

    const transactionRow = await adminPool.query(
      'SELECT remaining_points, points_earned FROM transactions WHERE id = $1',
      [transactionId],
    );
    assert.equal(transactionRow.rows[0].remaining_points, 120);
    assert.equal(transactionRow.rows[0].points_earned, 120);

    redemptionId = await withRlsTransaction(authReq, async (client) => {
      const cliente = await resolveTenantCustomerByDocument(client, ctx.tenantId, ctx.document);
      if (!cliente) {
        throw new Error('Cliente nao encontrado durante resgate');
      }

      const recompensaResult = await client.query(
        'SELECT points_cost FROM rewards WHERE id = $1 AND tenant_id = $2 AND is_active = true',
        [ctx.rewardId, ctx.tenantId],
      );
      const recompensa = recompensaResult.rows[0];
      assert.ok(recompensa, 'recompensa deve existir');

      const transacoesValidas = await client.query(
        `SELECT id, remaining_points FROM transactions
         WHERE customer_id = $1 AND tenant_id = $2 AND remaining_points > 0
           AND available_at <= NOW() AND expires_at > NOW()
         ORDER BY expires_at ASC, created_at ASC
         FOR UPDATE`,
        [cliente.id, ctx.tenantId],
      );

      const { updates } = buildFifoDebitUpdates(transacoesValidas.rows, recompensa.points_cost);

      if (updates.length > 0) {
        const { ids, caseClause } = buildFifoUpdateQuery(updates);
        await client.query(
          `UPDATE transactions SET remaining_points = ${caseClause} WHERE id = ANY($1) AND tenant_id = $2`,
          [ids, ctx.tenantId],
        );
      }

      const redemptionResult = await client.query(
        'INSERT INTO redemptions (customer_id, reward_id, points_spent, operator_id, tenant_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [cliente.id, ctx.rewardId, recompensa.points_cost, ctx.tenantUserId, ctx.tenantId],
      );

      return redemptionResult.rows[0]?.id as string;
    });

    const remainingRow = await adminPool.query(
      'SELECT remaining_points FROM transactions WHERE id = $1',
      [transactionId],
    );
    assert.equal(remainingRow.rows[0].remaining_points, 70);

    const redemptionRow = await adminPool.query(
      'SELECT points_spent FROM redemptions WHERE id = $1',
      [redemptionId],
    );
    assert.equal(redemptionRow.rows[0].points_spent, 50);
  } finally {
    await cleanupContext(ctx, customerId, consumerProfileId);
  }
});

integrationTest('integration: FIFO em duas transacoes', async (t) => {
  if (!hasDbConfig) {
    t.skip('Banco nao configurado para testes de integracao.');
    return;
  }

  const ctx = await setupContext();
  let customerId: string | undefined;
  let consumerProfileId: string | undefined;
  let transactionIds: string[] = [];

  try {
    const authReq = makeAuthRequest(ctx.tenantId, ctx.userId, ctx.tenantUserId);

    await adminPool.query(
      'UPDATE rewards SET points_cost = 100 WHERE id = $1 AND tenant_id = $2',
      [ctx.rewardId, ctx.tenantId],
    );

    const transacao = await withRlsTransaction(authReq, async (client) => {
      const configs = await loadTenantPointSettings(client, ctx.tenantId);
      const { availableAt, expiresAt } = calculatePointTimelines(
        configs.carencia_pontos,
        configs.expiracao_pontos,
      );
      const laterExpiresAt = new Date(expiresAt.getTime() + 24 * 60 * 60 * 1000);

      const cliente = await upsertTenantCustomerByDocument(client, {
        tenantId: ctx.tenantId,
        document: ctx.document,
        name: 'Cliente FIFO',
        lgpdConsent: false,
        consentDate: null,
      });

      const tx1 = await client.query(
        `INSERT INTO transactions (customer_id, amount_spent, points_earned, remaining_points, available_at, expires_at, operator_id, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [cliente.id, 80, 80, 80, availableAt, expiresAt, ctx.tenantUserId, ctx.tenantId],
      );

      const tx2 = await client.query(
        `INSERT INTO transactions (customer_id, amount_spent, points_earned, remaining_points, available_at, expires_at, operator_id, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [cliente.id, 50, 50, 50, availableAt, laterExpiresAt, ctx.tenantUserId, ctx.tenantId],
      );

      return {
        customerId: cliente.id,
        consumerProfileId: cliente.consumer_profile_id,
        transactionIds: [tx1.rows[0]?.id, tx2.rows[0]?.id],
      };
    });

    customerId = transacao.customerId;
    consumerProfileId = transacao.consumerProfileId ?? undefined;
    transactionIds = transacao.transactionIds;

    await withRlsTransaction(authReq, async (client) => {
      const cliente = await resolveTenantCustomerByDocument(client, ctx.tenantId, ctx.document);
      if (!cliente) {
        throw new Error('Cliente nao encontrado durante resgate');
      }

      const recompensaResult = await client.query(
        'SELECT points_cost FROM rewards WHERE id = $1 AND tenant_id = $2 AND is_active = true',
        [ctx.rewardId, ctx.tenantId],
      );
      const recompensa = recompensaResult.rows[0];
      assert.ok(recompensa, 'recompensa deve existir');

      const transacoesValidas = await client.query(
        `SELECT id, remaining_points FROM transactions
         WHERE customer_id = $1 AND tenant_id = $2 AND remaining_points > 0
           AND available_at <= NOW() AND expires_at > NOW()
         ORDER BY expires_at ASC, created_at ASC
         FOR UPDATE`,
        [cliente.id, ctx.tenantId],
      );

      const { updates } = buildFifoDebitUpdates(transacoesValidas.rows, recompensa.points_cost);
      const { ids, caseClause } = buildFifoUpdateQuery(updates);
      await client.query(
        `UPDATE transactions SET remaining_points = ${caseClause} WHERE id = ANY($1) AND tenant_id = $2`,
        [ids, ctx.tenantId],
      );
    });

    const firstRemaining = await adminPool.query(
      'SELECT remaining_points FROM transactions WHERE id = $1',
      [transactionIds[0]],
    );
    const secondRemaining = await adminPool.query(
      'SELECT remaining_points FROM transactions WHERE id = $1',
      [transactionIds[1]],
    );

    assert.equal(firstRemaining.rows[0].remaining_points, 0);
    assert.equal(secondRemaining.rows[0].remaining_points, 30);
  } finally {
    await cleanupContext(ctx, customerId, consumerProfileId);
  }
});

integrationTest('integration: saldo insuficiente', async (t) => {
  if (!hasDbConfig) {
    t.skip('Banco nao configurado para testes de integracao.');
    return;
  }

  const ctx = await setupContext();
  let customerId: string | undefined;
  let consumerProfileId: string | undefined;

  try {
    const authReq = makeAuthRequest(ctx.tenantId, ctx.userId, ctx.tenantUserId);

    await withRlsTransaction(authReq, async (client) => {
      const configs = await loadTenantPointSettings(client, ctx.tenantId);
      const { availableAt, expiresAt } = calculatePointTimelines(
        configs.carencia_pontos,
        configs.expiracao_pontos,
      );

      const cliente = await upsertTenantCustomerByDocument(client, {
        tenantId: ctx.tenantId,
        document: ctx.document,
        name: 'Cliente Saldo',
        lgpdConsent: false,
        consentDate: null,
      });

      customerId = cliente.id;
      consumerProfileId = cliente.consumer_profile_id ?? undefined;

      await client.query(
        `INSERT INTO transactions (customer_id, amount_spent, points_earned, remaining_points, available_at, expires_at, operator_id, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [cliente.id, 20, 20, 20, availableAt, expiresAt, ctx.tenantUserId, ctx.tenantId],
      );
    });

    await withRlsTransaction(authReq, async (client) => {
      const cliente = await resolveTenantCustomerByDocument(client, ctx.tenantId, ctx.document);
      if (!cliente) {
        throw new Error('Cliente nao encontrado durante resgate');
      }

      const transacoesValidas = await client.query(
        `SELECT id, remaining_points FROM transactions
         WHERE customer_id = $1 AND tenant_id = $2 AND remaining_points > 0
           AND available_at <= NOW() AND expires_at > NOW()
         ORDER BY expires_at ASC, created_at ASC
         FOR UPDATE`,
        [cliente.id, ctx.tenantId],
      );

      const pontosDisponiveis = transacoesValidas.rows.reduce((acc, t) => acc + t.remaining_points, 0);
      assert.ok(pontosDisponiveis < 50, 'saldo insuficiente para resgate');
    });
  } finally {
    await cleanupContext(ctx, customerId, consumerProfileId);
  }
});
