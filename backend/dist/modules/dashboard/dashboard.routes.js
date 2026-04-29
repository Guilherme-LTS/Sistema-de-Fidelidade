"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_rls_1 = require("../../infra/database/db-rls");
const autenticacao_1 = __importDefault(require("../../shared/middlewares/autenticacao"));
const router = (0, express_1.Router)();
// GET /dashboard/stats - Estatísticas do dashboard
router.get('/stats', autenticacao_1.default, async (req, res) => {
    try {
        const authReq = req;
        const tenantId = authReq.usuario?.tenant_id;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant do usuário não identificado.' });
        }
        const metricasQuery = `SELECT 
      (SELECT COUNT(*) FROM customers WHERE tenant_id = $1 AND deleted_at IS NULL) as total_clientes, 
      (SELECT COALESCE(SUM(remaining_points), 0) FROM transactions WHERE tenant_id = $1 AND remaining_points > 0 AND available_at > NOW()) as pontos_pendentes,
      (SELECT COALESCE(SUM(remaining_points), 0) FROM transactions WHERE tenant_id = $1 AND remaining_points > 0 AND available_at <= NOW() AND expires_at > NOW()) as pontos_disponiveis,
      (SELECT COALESCE(SUM(points_spent), 0) FROM redemptions WHERE tenant_id = $1) as pontos_resgatados;`;
        const resMetricas = await (0, db_rls_1.queryWithRLS)(authReq, metricasQuery, [tenantId]);
        const topClientesQuery = `
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
        const resTopClientes = await (0, db_rls_1.queryWithRLS)(authReq, topClientesQuery, [tenantId]);
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
        const resChart = await (0, db_rls_1.queryWithRLS)(authReq, chartQuery, [tenantId]);
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const dataGrafico = resChart.rows.map((row) => {
            const data = new Date(row.dia);
            return {
                name: diasSemana[data.getDay()],
                pendentes: parseInt(row.pendentes, 10) || 0,
                lancados: parseInt(row.lancados, 10) || 0,
                // Compatibilidade temporária com consumidores antigos
                disponiveis: parseInt(row.lancados, 10) || 0,
                redemptions: parseInt(row.redemptions, 10) || 0,
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
    }
    catch (error) {
        console.error('Erro ao buscar estatísticas do dashboard:', error);
        res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
    }
});
exports.default = router;
