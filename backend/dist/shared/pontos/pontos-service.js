"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadTenantPointSettings = loadTenantPointSettings;
exports.calculatePointTimelines = calculatePointTimelines;
exports.buildFifoDebitUpdates = buildFifoDebitUpdates;
exports.buildFifoUpdateQuery = buildFifoUpdateQuery;
async function loadTenantPointSettings(client, tenantId) {
    const configResult = await client.query(`
      SELECT setting_key, setting_value
      FROM tenant_settings
      WHERE tenant_id = $1
        AND deleted_at IS NULL
        AND setting_key IN ('carencia_pontos', 'expiracao_pontos')
    `, [tenantId]);
    const configs = {
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
function calculatePointTimelines(carenciaDias, expiracaoDias, baseDate = new Date()) {
    const availableAt = new Date(baseDate.getTime() + carenciaDias * 24 * 60 * 60 * 1000);
    const expiresAt = new Date(availableAt.getTime() + expiracaoDias * 24 * 60 * 60 * 1000);
    return { availableAt, expiresAt };
}
function buildFifoDebitUpdates(transactions, pointsCost) {
    let pontosNecessarios = pointsCost;
    const updates = [];
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
function buildFifoUpdateQuery(updates) {
    const ids = updates.map((update) => update.id);
    let caseClause = 'CASE id\n';
    updates.forEach((update) => {
        caseClause += `WHEN ${update.id} THEN remaining_points - ${update.descontar}\n`;
    });
    caseClause += 'ELSE remaining_points\nEND';
    return { ids, caseClause };
}
