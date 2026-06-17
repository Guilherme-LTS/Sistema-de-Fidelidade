import api from '../../services/api';

export type AuditoriaFilters = {
  page: number;
  limit: number;
  busca?: string;
  periodoInicio?: string;
  periodoFim?: string;
  eventType?: string;
  status?: string;
};

export async function buscarAuditoria(filters: AuditoriaFilters) {
  const params = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
  });

  if (filters.busca?.trim()) params.append('q', filters.busca.trim());
  if (filters.periodoInicio) params.append('startDate', `${filters.periodoInicio}T00:00:00`);
  if (filters.periodoFim) params.append('endDate', `${filters.periodoFim}T23:59:59`);
  if (filters.eventType) params.append('eventType', filters.eventType);
  if (filters.status) params.append('status', filters.status);

  const response = await api.get(`/admin/auditoria?${params.toString()}`);
  return response.data;
}
