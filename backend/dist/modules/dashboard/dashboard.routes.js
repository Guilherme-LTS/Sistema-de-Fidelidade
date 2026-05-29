"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_rls_1 = require("../../infra/database/db-rls");
const autenticacao_1 = __importDefault(require("../../shared/middlewares/autenticacao"));
const request_context_1 = require("../../shared/request-context");
const dashboard_1 = require("../../shared/query-builders/dashboard");
const router = (0, express_1.Router)();
// GET /dashboard/stats - Estatísticas do dashboard
router.get('/stats', autenticacao_1.default, async (req, res) => {
    try {
        const authReq = req;
        const tenantId = (0, request_context_1.getTenantId)(authReq);
        if (!tenantId) {
            return res.status(400).json({ error: request_context_1.TENANT_NOT_FOUND_ERROR });
        }
        const resMetricas = await (0, db_rls_1.queryWithRLS)(authReq, (0, dashboard_1.QUERY_DASHBOARD_METRICS)(), [tenantId]);
        const resTopClientes = await (0, db_rls_1.queryWithRLS)(authReq, (0, dashboard_1.QUERY_DASHBOARD_TOP_CLIENTS)(), [tenantId]);
        const resChart = await (0, db_rls_1.queryWithRLS)(authReq, (0, dashboard_1.QUERY_DASHBOARD_CHART_7DAYS)(), [tenantId]);
        const dataGrafico = (0, dashboard_1.buildDashboardChartData)(resChart.rows);
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
