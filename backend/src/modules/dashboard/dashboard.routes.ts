import { Router, Request, Response } from 'express';
import { queryWithRLS, AuthenticatedRequest } from '../../infra/database/db-rls';
import verificaToken from '../../shared/middlewares/autenticacao';
import { getTenantId, TENANT_NOT_FOUND_ERROR } from '../../shared/request-context';
import {
  QUERY_DASHBOARD_CHART_7DAYS,
  QUERY_DASHBOARD_METRICS,
  QUERY_DASHBOARD_TOP_CLIENTS,
  buildDashboardChartData,
} from '../../shared/query-builders/dashboard';

const router = Router();

// GET /dashboard/stats - Estatísticas do dashboard
router.get('/stats', verificaToken, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = getTenantId(authReq);
    if (!tenantId) {
      return res.status(400).json({ error: TENANT_NOT_FOUND_ERROR });
    }

    const resMetricas = await queryWithRLS(authReq, QUERY_DASHBOARD_METRICS(), [tenantId]);
    const resTopClientes = await queryWithRLS(authReq, QUERY_DASHBOARD_TOP_CLIENTS(), [tenantId]);
    const resChart = await queryWithRLS(authReq, QUERY_DASHBOARD_CHART_7DAYS(), [tenantId]);
    const dataGrafico = buildDashboardChartData(resChart.rows);

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