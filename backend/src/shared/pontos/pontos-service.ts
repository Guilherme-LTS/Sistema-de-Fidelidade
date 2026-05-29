import { PoolClient } from 'pg';

export type TenantPointSettings = {
  carencia_pontos: number;
  expiracao_pontos: number;
};

export type FifoDebitUpdate = {
  id: number;
  descontar: number;
};

export async function loadTenantPointSettings(client: PoolClient, tenantId: string): Promise<TenantPointSettings> {
  const configResult = await client.query(
    `
      SELECT setting_key, setting_value
      FROM tenant_settings
      WHERE tenant_id = $1
        AND deleted_at IS NULL
        AND setting_key IN ('carencia_pontos', 'expiracao_pontos')
    `,
    [tenantId]
  );

  const configs: TenantPointSettings = {
    carencia_pontos: 0,
    expiracao_pontos: 180
  };

  configResult.rows.forEach((row) => {
    if (row.setting_key === 'carencia_pontos' || row.setting_key === 'expiracao_pontos') {
      configs[row.setting_key] = Number(row.setting_value);
    }
  });

  return configs;
}

export function calculatePointTimelines(carenciaDias: number, expiracaoDias: number, baseDate = new Date()) {
  const availableAt = new Date(baseDate.getTime() + carenciaDias * 24 * 60 * 60 * 1000);
  const expiresAt = new Date(availableAt.getTime() + expiracaoDias * 24 * 60 * 60 * 1000);

  return { availableAt, expiresAt };
}

export function buildFifoDebitUpdates(transactions: Array<{ id: number; remaining_points: number }>, pointsCost: number) {
  let pontosNecessarios = pointsCost;
  const updates: FifoDebitUpdate[] = [];

  for (const transaction of transactions) {
    if (pontosNecessarios <= 0) {
      break;
    }

    const descontar = Math.min(transaction.remaining_points, pontosNecessarios);
    updates.push({ id: transaction.id, descontar });
    pontosNecessarios -= descontar;
  }

  return {
    updates,
    pontosRestantes: Math.max(0, transactions.reduce((acc, transaction) => acc + transaction.remaining_points, 0) - pointsCost)
  };
}

export function buildFifoUpdateQuery(updates: FifoDebitUpdate[]) {
  const ids = updates.map((update) => update.id);
  let caseClause = 'CASE id\n';

  updates.forEach((update) => {
    caseClause += `WHEN ${update.id} THEN remaining_points - ${update.descontar}\n`;
  });

  caseClause += 'ELSE remaining_points\nEND';

  return { ids, caseClause };
}