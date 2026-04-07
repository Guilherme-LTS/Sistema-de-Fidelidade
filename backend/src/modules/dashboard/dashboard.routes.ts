import { Router, Request, Response } from 'express';
import db from '../../infra/database/db';
import verificaToken from '../../shared/middlewares/autenticacao';

const router = Router();

// GET /dashboard/stats - Estatísticas do dashboard
router.get('/stats', verificaToken, async (req: Request, res: Response) => {
  try {
    const metricasQuery = `SELECT 
      (SELECT COUNT(*) FROM clientes) as total_clientes, 
      (SELECT COALESCE(SUM(pontos_restantes), 0) FROM transacoes WHERE pontos_restantes > 0 AND data_liberacao > NOW()) as pontos_pendentes,
      (SELECT COALESCE(SUM(pontos_restantes), 0) FROM transacoes WHERE pontos_restantes > 0 AND data_liberacao <= NOW() AND data_vencimento > NOW()) as pontos_disponiveis,
      (SELECT COALESCE(SUM(pontos_gastos), 0) FROM resgates) as pontos_resgatados;`;
    const resMetricas = await db.query(metricasQuery);

    const topClientesQuery = `
      SELECT
        c.nome,
        c.cpf,
        (SELECT COALESCE(SUM(t.pontos_restantes), 0) FROM transacoes t WHERE t.cliente_id = c.id AND t.data_liberacao <= NOW() AND t.data_vencimento > NOW()) as saldo_pontos
      FROM
        clientes c
      WHERE
        (SELECT COALESCE(SUM(t.pontos_restantes), 0) FROM transacoes t WHERE t.cliente_id = c.id AND t.data_liberacao <= NOW() AND t.data_vencimento > NOW()) > 0
      ORDER BY
        saldo_pontos DESC
      LIMIT 5;
    `;
    const resTopClientes = await db.query(topClientesQuery);

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
          COALESCE(SUM(pontos_ganhos), 0)::int AS lancados
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
        days.day_local::date AS dia,
        COALESCE(pendentes_agg.pendentes, 0) AS pendentes,
        COALESCE(disponibilizados_agg.lancados, 0) AS lancados,
        COALESCE(resgates_agg.resgates, 0) AS resgates
      FROM days
      LEFT JOIN pendentes_agg ON pendentes_agg.day_local = days.day_local
      LEFT JOIN disponibilizados_agg ON disponibilizados_agg.day_local = days.day_local
      LEFT JOIN resgates_agg ON resgates_agg.day_local = days.day_local
      ORDER BY days.day_local ASC;
    `;
    const resChart = await db.query(chartQuery);
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dataGrafico = resChart.rows.map((row: any) => {
      const data = new Date(row.dia);
      return {
        name: diasSemana[data.getDay()],
        pendentes: parseInt(row.pendentes, 10) || 0,
        lancados: parseInt(row.lancados, 10) || 0,
        // Compatibilidade temporária com consumidores antigos
        disponiveis: parseInt(row.lancados, 10) || 0,
        resgates: parseInt(row.resgates, 10) || 0,
      };
    });

    const row = resMetricas.rows[0];
    const stats = {
      totalClientes: parseInt(row.total_clientes || 0),
      pontosPendentes: parseInt(row.pontos_pendentes || 0),
      pontosDisponiveis: parseInt(row.pontos_disponiveis || 0),
      pontosResgatados: parseInt(row.pontos_resgatados || 0),
      recentes: resTopClientes.rows,
      chartData: dataGrafico
    };
    res.status(200).json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

export default router;