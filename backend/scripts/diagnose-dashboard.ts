import db from '../src/infra/database/db';

type ChartPoint = {
  name: string;
  date: string;
  pontos: number;
  resgates: number;
};

async function currentRouteLogic(): Promise<ChartPoint[]> {
  const dataGrafico: ChartPoint[] = [];
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);

    const startOfDay = new Date(d.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(d.setHours(23, 59, 59, 999)).toISOString();

    const resPontosDia = await db.query(
      'SELECT COALESCE(SUM(pontos_ganhos), 0) as total FROM transacoes WHERE data_transacao >= $1 AND data_transacao <= $2',
      [startOfDay, endOfDay]
    );

    const resResgatesDia = await db.query(
      'SELECT COALESCE(SUM(pontos_gastos), 0) as total FROM resgates WHERE data_resgate >= $1 AND data_resgate <= $2',
      [startOfDay, endOfDay]
    );

    dataGrafico.push({
      name: diasSemana[d.getDay()],
      date: new Date(startOfDay).toISOString().slice(0, 10),
      pontos: parseInt(resPontosDia.rows[0].total, 10) || 0,
      resgates: parseInt(resResgatesDia.rows[0].total, 10) || 0,
    });
  }

  return dataGrafico;
}

async function groupedSqlLogic(): Promise<ChartPoint[]> {
  const query = `
    WITH days AS (
      SELECT generate_series(
        date_trunc('day', NOW()) - interval '6 day',
        date_trunc('day', NOW()),
        interval '1 day'
      ) AS day
    ),
    transacoes_agg AS (
      SELECT date_trunc('day', data_transacao) AS day, COALESCE(SUM(pontos_ganhos), 0)::int AS pontos
      FROM transacoes
      WHERE data_transacao >= date_trunc('day', NOW()) - interval '6 day'
        AND data_transacao < date_trunc('day', NOW()) + interval '1 day'
      GROUP BY 1
    ),
    resgates_agg AS (
      SELECT date_trunc('day', data_resgate) AS day, COALESCE(SUM(pontos_gastos), 0)::int AS resgates
      FROM resgates
      WHERE data_resgate >= date_trunc('day', NOW()) - interval '6 day'
        AND data_resgate < date_trunc('day', NOW()) + interval '1 day'
      GROUP BY 1
    )
    SELECT
      days.day::date AS date,
      COALESCE(transacoes_agg.pontos, 0) AS pontos,
      COALESCE(resgates_agg.resgates, 0) AS resgates
    FROM days
    LEFT JOIN transacoes_agg ON transacoes_agg.day = days.day
    LEFT JOIN resgates_agg ON resgates_agg.day = days.day
    ORDER BY days.day ASC;
  `;

  const result = await db.query(query);
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  return result.rows.map((row: any) => {
    const d = new Date(row.date);
    return {
      name: diasSemana[d.getDay()],
      date: row.date.toISOString ? row.date.toISOString().slice(0, 10) : String(row.date).slice(0, 10),
      pontos: Number(row.pontos) || 0,
      resgates: Number(row.resgates) || 0,
    };
  });
}

async function globalStats() {
  const metricasQuery = `
    SELECT
      (SELECT COUNT(*) FROM clientes) as total_clientes,
      (SELECT COALESCE(SUM(pontos_restantes), 0) FROM transacoes WHERE data_liberacao > NOW()) as pontos_pendentes,
      (SELECT COALESCE(SUM(pontos_restantes), 0) FROM transacoes WHERE data_liberacao <= NOW() AND data_vencimento > NOW()) as pontos_disponiveis,
      (SELECT COALESCE(SUM(pontos_gastos), 0) FROM resgates) as pontos_resgatados
  `;
  const res = await db.query(metricasQuery);
  return res.rows[0];
}

async function main() {
  try {
    const [current, grouped, metrics] = await Promise.all([
      currentRouteLogic(),
      groupedSqlLogic(),
      globalStats(),
    ]);

    console.log('\n=== METRICAS GLOBAIS ===');
    console.table([metrics]);

    console.log('\n=== GRAFICO ATUAL (LOGICA DA ROTA) ===');
    console.table(current);

    console.log('\n=== GRAFICO AGRUPADO (SQL UNICO) ===');
    console.table(grouped);

    const mismatch = current.filter((c, i) => {
      const g = grouped[i];
      return !g || c.pontos !== g.pontos || c.resgates !== g.resgates || c.date !== g.date;
    });

    console.log('\n=== DIFERENCAS ===');
    if (mismatch.length === 0) {
      console.log('Sem diferencas numericas entre os dois metodos.');
    } else {
      console.table(mismatch);
    }
  } catch (err) {
    console.error('Falha no diagnostico do dashboard:', err);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

main();
