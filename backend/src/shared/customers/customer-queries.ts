import { AuthenticatedRequest, queryWithRLS } from '../../infra/database/db-rls';
import { APP_NOW_SQL } from '../time/app-clock';

export interface CustomerListQueryInput {
  busca?: string;
  page: number;
  limit: number;
  tenantId: string;
}

export interface CustomerListRow {
  id: string;
  name: string | null;
  document: string;
}

export interface CustomerFinancialSummary {
  nome: string;
  document: string;
  pontosDisponiveis: number;
  pontosPendentes: number;
  proximoVencimento: string | null;
  pontosExpirando: number;
  dataProximaExpiracao: string | null;
  dataProximaLiberacao: string | null;
}

export interface CustomerLookupRow {
  id: string;
  name: string | null;
  document: string;
}

export const listCustomers = async (
  authReq: AuthenticatedRequest,
  input: CustomerListQueryInput,
): Promise<{ total: number; customers: CustomerListRow[] }> => {
  const { busca, page, limit, tenantId } = input;
  const offset = (page - 1) * limit;

  if (busca && busca.trim() !== '') {
    const termoBuscaNome = `%${busca}%`;
    const cpfBusca = busca.replace(/\D/g, '');

    let whereClause = 'WHERE c.tenant_id = $1 AND c.deleted_at IS NULL AND (COALESCE(c.name, cp.name) ILIKE $2';
    const params: any[] = [tenantId, termoBuscaNome];

    if (cpfBusca) {
      whereClause += ' OR COALESCE(cp.document, c.document) LIKE $3';
      params.push(`%${cpfBusca}%`);
    }

    whereClause += ')';

    const countResult = await queryWithRLS(
      authReq,
      `SELECT COUNT(*) FROM customers c LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const limitOffsetPlaceholders = `LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const dataResult = await queryWithRLS(
      authReq,
      `
        SELECT
          c.id,
          COALESCE(c.name, cp.name) AS name,
          COALESCE(cp.document, c.document) AS document
        FROM customers c
        LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id
        ${whereClause}
        ORDER BY COALESCE(c.name, cp.name) ASC
        ${limitOffsetPlaceholders}
      `,
      [...params, limit, offset],
    );

    return { total, customers: dataResult.rows };
  }

  const countResult = await queryWithRLS(authReq, 'SELECT COUNT(*) FROM customers WHERE tenant_id = $1 AND deleted_at IS NULL', [tenantId]);
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await queryWithRLS(
    authReq,
    `
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
    `,
    [tenantId, limit, offset],
  );

  return { total, customers: dataResult.rows };
};

export const findCustomerByDocument = async (
  authReq: AuthenticatedRequest,
  tenantId: string,
  document: string,
): Promise<CustomerLookupRow | null> => {
  const clienteResult = await queryWithRLS(
    authReq,
    `
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
    `,
    [document, tenantId],
  );

  return clienteResult.rows[0] || null;
};

export const getCustomerFinancialSummary = async (
  authReq: AuthenticatedRequest,
  tenantId: string,
  customerId: string,
): Promise<Omit<CustomerFinancialSummary, 'nome' | 'document'>> => {
  const creditosResult = await queryWithRLS(
    authReq,
    `SELECT COALESCE(SUM(remaining_points), 0) as total FROM transactions WHERE customer_id = $1 AND tenant_id = $2 AND available_at <= ${APP_NOW_SQL} AND expires_at > ${APP_NOW_SQL}`,
    [customerId, tenantId],
  );
  const pontosDisponiveis = parseInt(creditosResult.rows[0].total, 10) || 0;

  const pontosPendentesResult = await queryWithRLS(
    authReq,
    `SELECT COALESCE(SUM(remaining_points), 0) as total FROM transactions WHERE customer_id = $1 AND tenant_id = $2 AND available_at > ${APP_NOW_SQL}`,
    [customerId, tenantId],
  );
  const pontosPendentes = parseInt(pontosPendentesResult.rows[0].total, 10) || 0;

  const proximoVencimentoResult = await queryWithRLS(
    authReq,
    `SELECT MIN(expires_at) as proximo_vencimento FROM transactions WHERE customer_id = $1 AND tenant_id = $2 AND expires_at > ${APP_NOW_SQL} AND available_at <= ${APP_NOW_SQL} AND remaining_points > 0`,
    [customerId, tenantId],
  );
  const proximoVencimento = proximoVencimentoResult.rows[0].proximo_vencimento ?? null;

  const expiracaoUrgenteResult = await queryWithRLS(
    authReq,
    `SELECT COALESCE(SUM(remaining_points), 0) as pontos_expirando, MIN(expires_at) as data_proxima_expiracao FROM transactions WHERE customer_id = $1 AND tenant_id = $2 AND available_at <= ${APP_NOW_SQL} AND expires_at > ${APP_NOW_SQL} AND expires_at <= ${APP_NOW_SQL} + INTERVAL '7 days' AND remaining_points > 0`,
    [customerId, tenantId],
  );
  const pontosExpirando = parseInt(expiracaoUrgenteResult.rows[0].pontos_expirando, 10) || 0;
  const dataProximaExpiracao = expiracaoUrgenteResult.rows[0].data_proxima_expiracao ?? null;

  const liberacaoUrgenteResult = await queryWithRLS(
    authReq,
    `SELECT MIN(available_at) as data_proxima_liberacao FROM transactions WHERE customer_id = $1 AND tenant_id = $2 AND available_at > ${APP_NOW_SQL} AND remaining_points > 0`,
    [customerId, tenantId],
  );
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

export const getCustomerStatement = async (
  authReq: AuthenticatedRequest,
  tenantId: string,
  customerId: string,
  limit: number,
) => {
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

  const extratoResult = await queryWithRLS(authReq, combinedQuery, [customerId, tenantId, limit]);
  return extratoResult.rows;
};
