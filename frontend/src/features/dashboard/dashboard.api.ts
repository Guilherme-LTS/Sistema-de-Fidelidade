import api from '../../services/api';

export interface DashboardStats {
  totalClientes: number;
  pontosPendentes: number;
  pontosDisponiveis: number;
  pontosResgatados: number;
  recentes: any[];
  chartData: any[];
}

export async function carregarDashboardStats(): Promise<DashboardStats> {
  const response = await api.get('/dashboard/stats');
  const payload = response.data || {};
  const normalizedChartData = Array.isArray(payload.chartData)
    ? payload.chartData.map((item: any) => ({
        name: item.name,
        pendentes: Number(item.pendentes ?? 0),
        lancados: Number(item.lancados ?? item.disponiveis ?? item.pontos ?? 0),
        resgates: Number(item.resgates ?? item.redemptions ?? 0),
      }))
    : [];

  return {
    totalClientes: Number(payload.totalClientes ?? 0),
    pontosPendentes: Number(payload.pontosPendentes ?? 0),
    pontosDisponiveis: Number(payload.pontosDisponiveis ?? payload.pontosAtivos ?? 0),
    pontosResgatados: Number(payload.pontosResgatados ?? payload.totalResgates ?? 0),
    recentes: Array.isArray(payload.recentes)
      ? payload.recentes.map((cliente: any) => ({
          nome: cliente?.nome ?? cliente?.name ?? '',
          document: cliente?.document ?? '',
          saldo_pontos: Number(cliente?.saldo_pontos ?? 0),
        }))
      : [],
    chartData: normalizedChartData,
  };
}
