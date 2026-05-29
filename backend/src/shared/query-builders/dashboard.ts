/**
 * Query builders for dashboard metrics, top clients, and charts.
 */

export type DashboardChartRow = {
  dia: string | Date;
  pendentes: string | number;
  lancados: string | number;
  redemptions: string | number;
};

export type DashboardChartPoint = {
  name: string;
  pendentes: number;
  lancados: number;
  disponiveis: number;
  redemptions: number;
};

/**
 * Query: Consolidated dashboard metrics.
 */
export const QUERY_DASHBOARD_METRICS = () => {
  return `SELECT 
    (SELECT COUNT(*) FROM customers WHERE tenant_id = $1 AND deleted_at IS NULL) as total_clientes, 
    (SELECT COALESCE(SUM(remaining_points), 0) FROM transactions WHERE tenant_id = $1 AND remaining_points > 0 AND available_at > NOW()) as pontos_pendentes,
    (SELECT COALESCE(SUM(remaining_points), 0) FROM transactions WHERE tenant_id = $1 AND remaining_points > 0 AND available_at <= NOW() AND expires_at > NOW()) as pontos_disponiveis,
    (SELECT COALESCE(SUM(points_spent), 0) FROM redemptions WHERE tenant_id = $1) as pontos_resgatados;`;
};

/**
 * Query: Top clients by available points (limit 5).
 */
export const QUERY_DASHBOARD_TOP_CLIENTS = () => {
  return `
    SELECT
      COALESCE(c.name, cp.name) AS nome,
      cp.document,
      (SELECT COALESCE(SUM(t.remaining_points), 0) FROM transactions t WHERE t.customer_id = c.id AND t.tenant_id = $1 AND t.available_at <= NOW() AND t.expires_at > NOW()) as saldo_pontos
    FROM
      customers c
    LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id
    WHERE
      c.tenant_id = $1
      AND c.deleted_at IS NULL
      AND (SELECT COALESCE(SUM(t.remaining_points), 0) FROM transactions t WHERE t.customer_id = c.id AND t.tenant_id = $1 AND t.available_at <= NOW() AND t.expires_at > NOW()) > 0
    ORDER BY
      saldo_pontos DESC
    LIMIT 5;
  `;
};

/**
 * Query: 7-day chart series (timezone fixed to America/Sao_Paulo).
 */
export const QUERY_DASHBOARD_CHART_7DAYS = () => {
  return `
    WITH params AS (
      SELECT 'America/Sao_Paulo'::text AS tz
    ),
    days AS (
      SELECT generate_series(
        date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)) - interval '6 day',
        date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)),
        interval '1 day'
      )::timestamp AS day_local
    ),
    pendentes_agg AS (
      SELECT
        date_trunc('day', created_at AT TIME ZONE (SELECT tz FROM params)) AS day_local,
        COALESCE(SUM(remaining_points), 0)::int AS pendentes
      FROM transactions
      WHERE tenant_id = $1
        AND available_at > created_at
        AND created_at >= ((date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)) - interval '6 day') AT TIME ZONE (SELECT tz FROM params))
        AND created_at < ((date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)) + interval '1 day') AT TIME ZONE (SELECT tz FROM params))
      GROUP BY 1
    ),
    disponibilizados_agg AS (
      SELECT
        date_trunc('day', available_at AT TIME ZONE (SELECT tz FROM params)) AS day_local,
        COALESCE(SUM(points_earned), 0)::int AS lancados
      FROM transactions
      WHERE tenant_id = $1
        AND available_at >= ((date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)) - interval '6 day') AT TIME ZONE (SELECT tz FROM params))
        AND available_at < ((date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)) + interval '1 day') AT TIME ZONE (SELECT tz FROM params))
      GROUP BY 1
    ),
    resgates_agg AS (
      SELECT
        date_trunc('day', created_at AT TIME ZONE (SELECT tz FROM params)) AS day_local,
        COALESCE(SUM(points_spent), 0)::int AS redemptions
      FROM redemptions
      WHERE tenant_id = $1
        AND created_at >= ((date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)) - interval '6 day') AT TIME ZONE (SELECT tz FROM params))
        AND created_at < ((date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)) + interval '1 day') AT TIME ZONE (SELECT tz FROM params))
      GROUP BY 1
    )
    SELECT
      days.day_local::date AS dia,
      COALESCE(pendentes_agg.pendentes, 0) AS pendentes,
      COALESCE(disponibilizados_agg.lancados, 0) AS lancados,
      COALESCE(resgates_agg.redemptions, 0) AS redemptions
    FROM days
    LEFT JOIN pendentes_agg ON pendentes_agg.day_local = days.day_local
    LEFT JOIN disponibilizados_agg ON disponibilizados_agg.day_local = days.day_local
    LEFT JOIN resgates_agg ON resgates_agg.day_local = days.day_local
    ORDER BY days.day_local ASC;
  `;
};

export const buildDashboardChartData = (rows: DashboardChartRow[]): DashboardChartPoint[] => {
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return rows.map((row) => {
    const data = new Date(row.dia);
    const pendentes = Number.parseInt(String(row.pendentes), 10) || 0;
    const lancados = Number.parseInt(String(row.lancados), 10) || 0;
    const redemptions = Number.parseInt(String(row.redemptions), 10) || 0;

    return {
      name: diasSemana[data.getDay()],
      pendentes,
      lancados,
      // Legacy alias for older consumers.
      disponiveis: lancados,
      redemptions,
    };
  });
};
