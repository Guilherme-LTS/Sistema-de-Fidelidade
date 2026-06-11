import api from '../../services/api';

export interface Recompensa {
  id: number;
  nome: string;
  name?: string;
  descricao: string;
  points_cost: string | number;
}

export type RecompensaPayload = {
  id?: number;
  nome: string;
  descricao: string;
  custo_pontos: number;
};

export const normalizeRecompensa = (recompensa: any): Recompensa => ({
  ...recompensa,
  nome: recompensa?.nome ?? recompensa?.name ?? '',
  descricao: recompensa?.descricao ?? recompensa?.description ?? '',
  points_cost: recompensa?.points_cost ?? recompensa?.custo_pontos ?? '',
});

export async function listarRecompensas() {
  const { data } = await api.get('/recompensas');
  return (data || []).map(normalizeRecompensa);
}

export async function salvarRecompensa(payload: RecompensaPayload) {
  if (payload.id) {
    return api.put(`/recompensas/${payload.id}`, payload);
  }

  return api.post('/recompensas', payload);
}

export async function excluirRecompensa(id: number) {
  return api.delete(`/recompensas/${id}`);
}
