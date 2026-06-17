import api from '../../services/api';
import { limparCpf } from '../clientes/clientes.api';

export async function resgatarRecompensa(input: { cpf: string; recompensaId: string }) {
  const document = limparCpf(input.cpf);
  const rewardId = Number(input.recompensaId);
  const response = await api.post('/resgates', {
    document,
    cpf: document,
    recompensa_id: rewardId,
    reward_id: rewardId,
  });

  return response.data;
}
