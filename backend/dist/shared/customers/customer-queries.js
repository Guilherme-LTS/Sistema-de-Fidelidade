"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerStatement = exports.getCustomerFinancialSummary = exports.findCustomerByDocument = exports.listCustomers = void 0;
const db_rls_1 = require("../../infra/database/db-rls");
const listCustomers = async (authReq, input) => {
    const { busca, page, limit, tenantId } = input;
    const offset = (page - 1) * limit;
    if (busca && busca.trim() !== '') {
        const termoBuscaNome = `%${busca}%`;
        const cpfBusca = busca.replace(/\D/g, '');
        let whereClause = 'WHERE c.tenant_id = $1 AND c.deleted_at IS NULL AND (COALESCE(c.name, cp.name) ILIKE $2';
        const params = [tenantId, termoBuscaNome];
        if (cpfBusca) {
            whereClause += ' OR COALESCE(cp.document, c.document) LIKE $3';
            params.push(`%${cpfBusca}%`);
        }
        whereClause += ')';
        const countResult = await (0, db_rls_1.queryWithRLS)(authReq, `SELECT COUNT(*) FROM customers c LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id ${whereClause}`, params);
        const total = parseInt(countResult.rows[0].count, 10);
        const limitOffsetPlaceholders = `LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        const dataResult = await (0, db_rls_1.queryWithRLS)(authReq, `
        SELECT
          c.id,
          COALESCE(c.name, cp.name) AS name,
          COALESCE(cp.document, c.document) AS document
        FROM customers c
        LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id
        ${whereClause}
        ORDER BY COALESCE(c.name, cp.name) ASC
        ${limitOffsetPlaceholders}
      `, [...params, limit, offset]);
        return { total, customers: dataResult.rows };
    }
    const countResult = await (0, db_rls_1.queryWithRLS)(authReq, 'SELECT COUNT(*) FROM customers WHERE tenant_id = $1 AND deleted_at IS NULL', [tenantId]);
    const total = parseInt(countResult.rows[0].count, 10);
    const dataResult = await (0, db_rls_1.queryWithRLS)(authReq, `
      SELECT
        c.id,
        COALESCE(c.name, cp.name) AS name,
        COALESCE(cp.document, c.document) AS document
      FROM customers c
      LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id
      WHERE c.tenant_id = $1
        AND c.deleted_at IS NULL
      ORDER BY COALESCE(c.name, cp.name) ASC
      LIMIT $2 OFFSET $3
    `, [tenantId, limit, offset]);
    return { total, customers: dataResult.rows };
};
exports.listCustomers = listCustomers;
const findCustomerByDocument = async (authReq, tenantId, document) => {
    const clienteResult = await (0, db_rls_1.queryWithRLS)(authReq, `
      SELECT
        c.id,
        COALESCE(c.name, cp.name) AS name,
        COALESCE(cp.document, c.document) AS document
      FROM customers c
      LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id
      WHERE COALESCE(cp.document, c.document) = $1
        AND c.tenant_id = $2
        AND c.deleted_at IS NULL
      LIMIT 1
    `, [document, tenantId]);
    return clienteResult.rows[0] || null;
};
exports.findCustomerByDocument = findCustomerByDocument;
const getCustomerFinancialSummary = async (authReq, tenantId, customerId) => {
    const creditosResult = await (0, db_rls_1.queryWithRLS)(authReq, `SELECT COALESCE(SUM(remaining_points), 0) as total FROM transactions WHERE customer_id = $1 AND tenant_id = $2 AND available_at <= NOW() AND expires_at > NOW()`, [customerId, tenantId]);
    const pontosDisponiveis = parseInt(creditosResult.rows[0].total, 10) || 0;
    const pontosPendentesResult = await (0, db_rls_1.queryWithRLS)(authReq, `SELECT COALESCE(SUM(remaining_points), 0) as total FROM transactions WHERE customer_id = $1 AND tenant_id = $2 AND available_at > NOW()`, [customerId, tenantId]);
    const pontosPendentes = parseInt(pontosPendentesResult.rows[0].total, 10) || 0;
    const proximoVencimentoResult = await (0, db_rls_1.queryWithRLS)(authReq, `SELECT MIN(expires_at) as proximo_vencimento FROM transactions WHERE customer_id = $1 AND tenant_id = $2 AND expires_at > NOW() AND available_at <= NOW() AND remaining_points > 0`, [customerId, tenantId]);
    const proximoVencimento = proximoVencimentoResult.rows[0].proximo_vencimento ?? null;
    const expiracaoUrgenteResult = await (0, db_rls_1.queryWithRLS)(authReq, `SELECT COALESCE(SUM(remaining_points), 0) as pontos_expirando, MIN(expires_at) as data_proxima_expiracao FROM transactions WHERE customer_id = $1 AND tenant_id = $2 AND available_at <= NOW() AND expires_at > NOW() AND expires_at <= NOW() + INTERVAL '7 days' AND remaining_points > 0`, [customerId, tenantId]);
    const pontosExpirando = parseInt(expiracaoUrgenteResult.rows[0].pontos_expirando, 10) || 0;
    const dataProximaExpiracao = expiracaoUrgenteResult.rows[0].data_proxima_expiracao ?? null;
    const liberacaoUrgenteResult = await (0, db_rls_1.queryWithRLS)(authReq, `SELECT MIN(available_at) as data_proxima_liberacao FROM transactions WHERE customer_id = $1 AND tenant_id = $2 AND available_at > NOW() AND remaining_points > 0`, [customerId, tenantId]);
    const dataProximaLiberacao = liberacaoUrgenteResult.rows[0].data_proxima_liberacao ?? null;
    return {
        pontosDisponiveis,
        pontosPendentes,
        proximoVencimento,
        pontosExpirando,
        dataProximaExpiracao,
        dataProximaLiberacao,
    };
};
exports.getCustomerFinancialSummary = getCustomerFinancialSummary;
const getCustomerStatement = async (authReq, tenantId, customerId, limit) => {
    const combinedQuery = `
    SELECT * FROM (
      SELECT 'credito' as tipo, points_earned as pontos, created_at as data, 'Pontos por compra' as descricao
      FROM transactions WHERE customer_id = $1 AND tenant_id = $2
      UNION ALL
      SELECT 'debito' as tipo, res.points_spent as pontos, res.created_at as data, rec.name as descricao
      FROM redemptions res JOIN rewards rec ON res.reward_id = rec.id AND rec.tenant_id = $2 WHERE res.customer_id = $1 AND res.tenant_id = $2
    ) as extrato_unificado
    ORDER BY data DESC
    LIMIT $3
  `;
    const extratoResult = await (0, db_rls_1.queryWithRLS)(authReq, combinedQuery, [customerId, tenantId, limit]);
    return extratoResult.rows;
};
exports.getCustomerStatement = getCustomerStatement;
