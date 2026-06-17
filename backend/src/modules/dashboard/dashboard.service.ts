import { buildDashboardChartData } from '../../shared/query-builders/dashboard';
import { DashboardRepository } from './dashboard.repository';

export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async getStats(tenantId: string) {
    const [metrics, topClients, chartRows] = await Promise.all([
      this.repository.getMetrics(tenantId),
      this.repository.getTopClients(tenantId),
      this.repository.getSevenDayChartRows(tenantId),
    ]);

    return {
      totalClientes: parseInt(metrics.total_clientes || 0),
      pontosPendentes: parseInt(metrics.pontos_pendentes || 0),
      pontosDisponiveis: parseInt(metrics.pontos_disponiveis || 0),
      pontosResgatados: parseInt(metrics.pontos_resgatados || 0),
      recentes: topClients,
      chartData: buildDashboardChartData(chartRows),
    };
  }
}
