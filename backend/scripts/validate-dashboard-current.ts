import db from '../src/infra/database/db';

type Point = {
  dia: string;
  pendentes: number;
  disponiveis: number;
  resgates: number;
};

async function chartFromCurrentRouteQuery(): Promise<Point[]> {
  const chartQuery = `
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
        date_trunc('day', data_transacao AT TIME ZONE (SELECT tz FROM params)) AS day_local,
        COALESCE(SUM(pontos_ganhos), 0)::int AS pendentes
      FROM transacoes
      WHERE data_liberacao > data_transacao
        AND data_transacao >= ((date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)) - interval '6 day') AT TIME ZONE (SELECT tz FROM params))
        AND data_transacao < ((date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)) + interval '1 day') AT TIME ZONE (SELECT tz FROM params))
      GROUP BY 1
    ),
    disponibilizados_agg AS (
      SELECT
        date_trunc('day', data_liberacao AT TIME ZONE (SELECT tz FROM params)) AS day_local,
        COALESCE(SUM(pontos_ganhos), 0)::int AS disponiveis
      FROM transacoes
      WHERE data_liberacao >= ((date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)) - interval '6 day') AT TIME ZONE (SELECT tz FROM params))
        AND data_liberacao < ((date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)) + interval '1 day') AT TIME ZONE (SELECT tz FROM params))
      GROUP BY 1
    ),
    resgates_agg AS (
      SELECT
        date_trunc('day', data_resgate AT TIME ZONE (SELECT tz FROM params)) AS day_local,
        COALESCE(SUM(pontos_gastos), 0)::int AS resgates
      FROM resgates
      WHERE data_resgate >= ((date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)) - interval '6 day') AT TIME ZONE (SELECT tz FROM params))
        AND data_resgate < ((date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)) + interval '1 day') AT TIME ZONE (SELECT tz FROM params))
      GROUP BY 1
    )
    SELECT
      to_char(days.day_local::date, 'YYYY-MM-DD') AS dia,
      COALESCE(pendentes_agg.pendentes, 0) AS pendentes,
      COALESCE(disponibilizados_agg.disponiveis, 0) AS disponiveis,
      COALESCE(resgates_agg.resgates, 0) AS resgates
    FROM days
    LEFT JOIN pendentes_agg ON pendentes_agg.day_local = days.day_local
    LEFT JOIN disponibilizados_agg ON disponibilizados_agg.day_local = days.day_local
    LEFT JOIN resgates_agg ON resgates_agg.day_local = days.day_local
    ORDER BY days.day_local ASC;
  `;

  const res = await db.query(chartQuery);
  return res.rows.map((r: any) => ({
    dia: String(r.dia),
    pendentes: Number(r.pendentes) || 0,
    disponiveis: Number(r.disponiveis) || 0,
    resgates: Number(r.resgates) || 0,
  }));
}

async function rawDailyCrossCheck(): Promise<Point[]> {
  const query = `
    WITH params AS (
      SELECT 'America/Sao_Paulo'::text AS tz
    ),
    pendentes AS (
      SELECT
        to_char((data_transacao AT TIME ZONE (SELECT tz FROM params))::date, 'YYYY-MM-DD') AS dia,
        COALESCE(SUM(pontos_ganhos), 0)::int AS pendentes
      FROM transacoes
      WHERE data_liberacao > data_transacao
        AND data_transacao >= ((date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)) - interval '6 day') AT TIME ZONE (SELECT tz FROM params))
        AND data_transacao < ((date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)) + interval '1 day') AT TIME ZONE (SELECT tz FROM params))
      GROUP BY 1
    ),
    disponibilizados AS (
      SELECT
        to_char((data_liberacao AT TIME ZONE (SELECT tz FROM params))::date, 'YYYY-MM-DD') AS dia,
        COALESCE(SUM(pontos_ganhos), 0)::int AS disponiveis
      FROM transacoes
      WHERE data_liberacao >= ((date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)) - interval '6 day') AT TIME ZONE (SELECT tz FROM params))
        AND data_liberacao < ((date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)) + interval '1 day') AT TIME ZONE (SELECT tz FROM params))
      GROUP BY 1
    ),
    resgates AS (
      SELECT
        to_char((data_resgate AT TIME ZONE (SELECT tz FROM params))::date, 'YYYY-MM-DD') AS dia,
        COALESCE(SUM(pontos_gastos), 0)::int AS resgates
      FROM resgates
      WHERE data_resgate >= ((date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)) - interval '6 day') AT TIME ZONE (SELECT tz FROM params))
        AND data_resgate < ((date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)) + interval '1 day') AT TIME ZONE (SELECT tz FROM params))
      GROUP BY 1
    ),
    dias AS (
      SELECT to_char((generate_series(
        date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)) - interval '6 day',
        date_trunc('day', now() AT TIME ZONE (SELECT tz FROM params)),
        interval '1 day'
      ))::date, 'YYYY-MM-DD') AS dia
    )
    SELECT
      dias.dia,
      COALESCE(pendentes.pendentes, 0) AS pendentes,
      COALESCE(disponibilizados.disponiveis, 0) AS disponiveis,
      COALESCE(resgates.resgates, 0) AS resgates
    FROM dias
    LEFT JOIN pendentes ON pendentes.dia = dias.dia
    LEFT JOIN disponibilizados ON disponibilizados.dia = dias.dia
    LEFT JOIN resgates ON resgates.dia = dias.dia
    ORDER BY dias.dia ASC;
  `;

  const res = await db.query(query);
  return res.rows.map((r: any) => ({
    dia: String(r.dia),
    pendentes: Number(r.pendentes) || 0,
    disponiveis: Number(r.disponiveis) || 0,
    resgates: Number(r.resgates) || 0,
  }));
}

async function globalMetrics() {
  const metricasQuery = `
    SELECT
      (SELECT COUNT(*) FROM clientes) as total_clientes,
      (SELECT COALESCE(SUM(pontos_restantes), 0) FROM transacoes WHERE pontos_restantes > 0 AND data_liberacao > NOW()) as pontos_pendentes,
      (SELECT COALESCE(SUM(pontos_restantes), 0) FROM transacoes WHERE pontos_restantes > 0 AND data_liberacao <= NOW() AND data_vencimento > NOW()) as pontos_disponiveis,
      (SELECT COALESCE(SUM(pontos_gastos), 0) FROM resgates) as pontos_resgatados
  `;
  return (await db.query(metricasQuery)).rows[0];
}

async function main() {
  try {
    const [chart, raw, metrics] = await Promise.all([
      chartFromCurrentRouteQuery(),
      rawDailyCrossCheck(),
      globalMetrics(),
    ]);

    console.log('\n=== METRICAS GLOBAIS ===');
    console.table([metrics]);

    console.log('\n=== CHART (ROTA ATUAL) ===');
    console.table(chart);

    console.log('\n=== CROSS-CHECK (RAW DB) ===');
    console.table(raw);

    const diffs = chart.filter((c, i) => {
      const r = raw[i];
      return !r || c.dia !== r.dia || c.pendentes !== r.pendentes || c.disponiveis !== r.disponiveis || c.resgates !== r.resgates;
    });

    console.log('\n=== DIFERENCAS ===');
    if (diffs.length === 0) {
      console.log('OK: chart da rota bate com os dados brutos do banco nos ultimos 7 dias.');
    } else {
      console.table(diffs);
      process.exitCode = 2;
    }
  } catch (err) {
    console.error('Falha na validacao do dashboard:', err);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

main();
