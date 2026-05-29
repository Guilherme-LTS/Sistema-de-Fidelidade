import { AuthenticatedRequest, queryWithRLS } from '../../infra/database/db-rls';

type QueryExecutor = (
  authReq: AuthenticatedRequest,
  query: string,
  params: Array<string | number | Date>
) => Promise<{ rows: any[] }>;

type AuditFilters = {
  searchText: string;
  eventType: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
};

type AuditPagination = {
  page: number;
  limit: number;
};

type AuditSummary = {
  total: number;
  lancamentos: number;
  resgates: number;
  configuracoes: number;
  falhas: number;
};

type AuditReport = {
  data: any[];
  summary: AuditSummary;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

type AuditWhereBuild = {
  whereSql: string;
  params: Array<string | number | Date>;
  paramIndex: number;
};

const EMPTY_SUMMARY: AuditSummary = {
  total: 0,
  lancamentos: 0,
  resgates: 0,
  configuracoes: 0,
  falhas: 0,
};

const buildAuditWhere = (tenantId: string, filters: AuditFilters): AuditWhereBuild => {
  const whereClauses: string[] = ['a.tenant_id = $1'];
  const params: Array<string | number | Date> = [tenantId];
  let paramIndex = 2;

  if (filters.searchText) {
    whereClauses.push(`(a.action ILIKE $${paramIndex} OR COALESCE(a.details, '') ILIKE $${paramIndex} OR COALESCE(tu.name, '') ILIKE $${paramIndex} OR COALESCE(a.target_label, '') ILIKE $${paramIndex})`);
    params.push(`%${filters.searchText}%`);
    paramIndex += 1;
  }

  if (filters.eventType) {
    whereClauses.push(`a.action = $${paramIndex}`);
    params.push(filters.eventType);
    paramIndex += 1;
  }

  if (filters.status) {
    whereClauses.push(`COALESCE(a.status, 'SUCESSO') = $${paramIndex}`);
    params.push(filters.status);
    paramIndex += 1;
  }

  if (filters.startDate) {
    whereClauses.push(`a.created_at >= $${paramIndex}`);
    params.push(filters.startDate);
    paramIndex += 1;
  }

  if (filters.endDate) {
    whereClauses.push(`a.created_at <= $${paramIndex}`);
    params.push(filters.endDate);
    paramIndex += 1;
  }

  return { whereSql: whereClauses.join(' AND '), params, paramIndex };
};

const buildLegacyWhere = (
  tenantId: string,
  filters: AuditFilters,
  limit: number,
  offset: number,
) => {
  const legacyWhere: string[] = ['legacy.tenant_id = $3'];
  const legacyParams: Array<string | number | Date> = [limit, offset, tenantId];
  let legacyParamIdx = 4;

  if (filters.searchText) {
    legacyWhere.push(`(legacy.acao ILIKE $${legacyParamIdx} OR COALESCE(legacy.detalhes, '') ILIKE $${legacyParamIdx} OR COALESCE(legacy.operator_name, '') ILIKE $${legacyParamIdx} OR COALESCE(legacy.alvo, '') ILIKE $${legacyParamIdx})`);
    legacyParams.push(`%${filters.searchText}%`);
    legacyParamIdx += 1;
  }

  if (filters.eventType) {
    legacyWhere.push(`legacy.acao = $${legacyParamIdx}`);
    legacyParams.push(filters.eventType);
    legacyParamIdx += 1;
  }

  if (filters.startDate) {
    legacyWhere.push(`legacy.data_hora >= $${legacyParamIdx}`);
    legacyParams.push(filters.startDate);
    legacyParamIdx += 1;
  }

  if (filters.endDate) {
    legacyWhere.push(`legacy.data_hora <= $${legacyParamIdx}`);
    legacyParams.push(filters.endDate);
    legacyParamIdx += 1;
  }

  const legacyWhereSql = legacyWhere.length > 0 ? `WHERE ${legacyWhere.join(' AND ')}` : '';

  const legacyCountWhere: string[] = ['legacy.tenant_id = $1'];
  const legacyCountParams: Array<string | Date> = [tenantId];
  let legacyCountIdx = 2;

  if (filters.searchText) {
    legacyCountWhere.push(`(legacy.acao ILIKE $${legacyCountIdx} OR COALESCE(legacy.detalhes, '') ILIKE $${legacyCountIdx} OR COALESCE(legacy.operator_name, '') ILIKE $${legacyCountIdx} OR COALESCE(legacy.alvo, '') ILIKE $${legacyCountIdx})`);
    legacyCountParams.push(`%${filters.searchText}%`);
    legacyCountIdx += 1;
  }

  if (filters.eventType) {
    legacyCountWhere.push(`legacy.acao = $${legacyCountIdx}`);
    legacyCountParams.push(filters.eventType);
    legacyCountIdx += 1;
  }

  if (filters.startDate) {
    legacyCountWhere.push(`legacy.data_hora >= $${legacyCountIdx}`);
    legacyCountParams.push(filters.startDate);
    legacyCountIdx += 1;
  }

  if (filters.endDate) {
    legacyCountWhere.push(`legacy.data_hora <= $${legacyCountIdx}`);
    legacyCountParams.push(filters.endDate);
    legacyCountIdx += 1;
  }

  const legacyCountWhereSql = legacyCountWhere.length > 0 ? `WHERE ${legacyCountWhere.join(' AND ')}` : '';

  return {
    legacyWhereSql,
    legacyParams,
    legacyCountWhereSql,
    legacyCountParams,
  };
};

export const fetchAuditReport = async (
  authReq: AuthenticatedRequest,
  tenantId: string,
  filters: AuditFilters,
  pagination: AuditPagination,
  queryExecutor: QueryExecutor = queryWithRLS,
): Promise<AuditReport> => {
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  const { whereSql, params, paramIndex } = buildAuditWhere(tenantId, filters);
  let totalItens = 0;
  let totalAuditLogsTenant = 0;
  let hasAuditTable = true;

  try {
    const tenantCountResult = await queryExecutor(
      authReq,
      `
        SELECT COUNT(*)::int AS count
        FROM audit_logs a
        WHERE a.tenant_id = $1
      `,
      [tenantId],
    );
    totalAuditLogsTenant = tenantCountResult.rows[0]?.count || 0;

    const countResult = await queryExecutor(
      authReq,
      `
        SELECT COUNT(*)::int AS count
        FROM audit_logs a
        LEFT JOIN tenant_users tu ON tu.id = a.operator_id
        WHERE ${whereSql}
      `,
      params,
    );
    totalItens = countResult.rows[0]?.count || 0;
  } catch (error: any) {
    if (error?.code === '42P01') {
      hasAuditTable = false;
    } else {
      throw error;
    }
  }

  if (hasAuditTable && totalAuditLogsTenant > 0) {
    const result = await queryExecutor(
      authReq,
      `
        SELECT
          a.id,
          a.created_at AS data_hora,
          a.action AS acao,
          a.details AS detalhes,
          COALESCE(a.status, 'SUCESSO') AS status,
          a.target_label AS alvo,
          a.impact_label AS impacto,
          a.ip_address::text AS ip,
          a.operator_id,
          tu.name AS operator_name,
          a.entity_type,
          a.entity_id
        FROM audit_logs a
        LEFT JOIN tenant_users tu ON tu.id = a.operator_id
        WHERE ${whereSql}
        ORDER BY a.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
      [...params, limit, offset],
    );

    const summaryResult = await queryExecutor(
      authReq,
      `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE a.action = 'LANCAMENTO_PONTOS')::int AS lancamentos,
          COUNT(*) FILTER (WHERE a.action = 'RESGATE_RECOMPENSA')::int AS resgates,
          COUNT(*) FILTER (WHERE a.action = 'ALTERACAO_CONFIGURACOES')::int AS configuracoes,
          COUNT(*) FILTER (WHERE COALESCE(a.status, 'SUCESSO') = 'FALHA')::int AS falhas
        FROM audit_logs a
        LEFT JOIN tenant_users tu ON tu.id = a.operator_id
        WHERE ${whereSql}
      `,
      params,
    );

    const summary = summaryResult.rows[0] || EMPTY_SUMMARY;

    return {
      data: result.rows,
      summary,
      pagination: {
        total: totalItens,
        page,
        limit,
        totalPages: Math.max(Math.ceil(totalItens / limit), 1),
      },
    };
  }

  if (filters.status === 'FALHA') {
    return {
      data: [],
      summary: EMPTY_SUMMARY,
      pagination: {
        total: 0,
        page,
        limit,
        totalPages: 1,
      },
    };
  }

  const {
    legacyWhereSql,
    legacyParams,
    legacyCountWhereSql,
    legacyCountParams,
  } = buildLegacyWhere(tenantId, filters, limit, offset);

  const legacyResult = await queryExecutor(
    authReq,
    `
      SELECT *
      FROM (
        SELECT
          'tx-' || t.id::text AS id,
          t.created_at AS data_hora,
          'LANCAMENTO_PONTOS' AS acao,
          ('Lancamento de ' || t.points_earned || ' pontos para ' || COALESCE(c.name, 'cliente') || '.') AS detalhes,
          'SUCESSO'::text AS status,
          COALESCE(c.name, 'Cliente') AS alvo,
          ('+' || t.points_earned || ' pts') AS impacto,
          NULL::text AS ip,
          t.operator_id,
          tu.name AS operator_name,
          t.tenant_id,
          'transaction'::text AS entity_type,
          t.id::text AS entity_id
        FROM transactions t
        LEFT JOIN customers c ON c.id = t.customer_id
        LEFT JOIN tenant_users tu ON tu.id = t.operator_id AND tu.tenant_id = t.tenant_id

        UNION ALL

        SELECT
          'rd-' || r.id::text AS id,
          r.created_at AS data_hora,
          'RESGATE_RECOMPENSA' AS acao,
          ('Resgate de ' || COALESCE(rec.name, 'recompensa') || ' por ' || r.points_spent || ' pontos.') AS detalhes,
          'SUCESSO'::text AS status,
          COALESCE(rec.name, 'Recompensa') AS alvo,
          ('-' || r.points_spent || ' pts') AS impacto,
          NULL::text AS ip,
          r.operator_id,
          tu.name AS operator_name,
          r.tenant_id,
          'redemption'::text AS entity_type,
          r.id::text AS entity_id
        FROM redemptions r
        LEFT JOIN rewards rec ON rec.id = r.reward_id AND rec.tenant_id = r.tenant_id
        LEFT JOIN tenant_users tu ON tu.id = r.operator_id AND tu.tenant_id = r.tenant_id
      ) AS legacy
      ${legacyWhereSql}
      ORDER BY legacy.data_hora DESC
      LIMIT $1 OFFSET $2
    `,
    legacyParams,
  );

  const legacyCount = await queryExecutor(
    authReq,
    `
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT
          t.created_at AS data_hora,
          'LANCAMENTO_PONTOS' AS acao,
          ('Lancamento de ' || t.points_earned || ' pontos para ' || COALESCE(c.name, 'cliente') || '.') AS detalhes,
          tu.name AS operator_name,
          t.tenant_id,
          COALESCE(c.name, 'Cliente') AS alvo
        FROM transactions t
        LEFT JOIN customers c ON c.id = t.customer_id
        LEFT JOIN tenant_users tu ON tu.id = t.operator_id AND tu.tenant_id = t.tenant_id

        UNION ALL

        SELECT
          r.created_at AS data_hora,
          'RESGATE_RECOMPENSA' AS acao,
          ('Resgate de ' || COALESCE(rec.name, 'recompensa') || ' por ' || r.points_spent || ' pontos.') AS detalhes,
          tu.name AS operator_name,
          r.tenant_id,
          COALESCE(rec.name, 'Recompensa') AS alvo
        FROM redemptions r
        LEFT JOIN rewards rec ON rec.id = r.reward_id AND rec.tenant_id = r.tenant_id
        LEFT JOIN tenant_users tu ON tu.id = r.operator_id AND tu.tenant_id = r.tenant_id
      ) legacy
      ${legacyCountWhereSql}
    `,
    legacyCountParams,
  );

  const summary = legacyResult.rows.reduce((acc: AuditSummary, row: any) => {
    acc.total += 1;
    if (row.acao === 'LANCAMENTO_PONTOS') acc.lancamentos += 1;
    if (row.acao === 'RESGATE_RECOMPENSA') acc.resgates += 1;
    return acc;
  }, { ...EMPTY_SUMMARY });

  const totalLegacy = legacyCount.rows[0]?.count || 0;

  return {
    data: legacyResult.rows,
    summary,
    pagination: {
      total: totalLegacy,
      page,
      limit,
      totalPages: Math.max(Math.ceil(totalLegacy / limit), 1),
    },
  };
};
