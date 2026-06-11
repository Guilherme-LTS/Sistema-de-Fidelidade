import api from '../../services/api';

export interface Cliente {
  id: number;
  nome: string;
  name?: string;
  document: string;
  pontosDisponiveis?: number;
  pontosPendentes?: number;
  pontosExpirando?: number;
  dataProximaExpiracao?: string | null;
  dataProximaLiberacao?: string | null;
}

export const normalizeCliente = (cliente: any): Cliente => ({
  ...cliente,
  nome: cliente?.nome ?? cliente?.name ?? '',
});

export function limparCpf(cpf: string) {
  return (cpf || '').replace(/\D/g, '');
}

export async function consultarClientePorCpf(cpf: string) {
  const response = await api.get(`/clientes/${limparCpf(cpf)}`);
  return normalizeCliente(response.data);
}

export async function consultarClienteComExtrato(cpf: string) {
  const cpfLimpo = limparCpf(cpf);
  const [clienteResponse, extratoResponse] = await Promise.all([
    api.get(`/clientes/${cpfLimpo}`),
    api.get(`/clientes/${cpfLimpo}/extrato`),
  ]);

  return {
    cliente: normalizeCliente(clienteResponse.data),
    extrato: extratoResponse.data,
  };
}

export async function listarClientes(input: { busca?: string; page: number }) {
  const params = new URLSearchParams({
    busca: input.busca || '',
    page: String(input.page),
  });
  const response = await api.get(`/clientes?${params.toString()}`);
  const data = response.data;

  return {
    clientes: (data.customers || []).map(normalizeCliente),
    totalPaginas: data.totalPaginas || 1,
  };
}
