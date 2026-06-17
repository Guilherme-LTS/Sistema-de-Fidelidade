import api from '../../services/api';
import { limparCpf } from '../clientes/clientes.api';

export async function lancarPontos(input: { cpf: string; valor: string; nome?: string }) {
  const document = limparCpf(input.cpf);
  const response = await api.post('/transacoes', {
    document,
    cpf: document,
    valor: parseFloat(input.valor),
    nome: input.nome,
  });

  return response.data;
}
