import api from '../../services/api';

export async function carregarConfiguracoesTenant() {
  const response = await api.get('/admin/tenant_settings');
  return response.data;
}

export async function salvarConfiguracoesTenant(input: { carenciaPontos: number; expiracaoPontos: number }) {
  return api.put('/admin/tenant_settings', {
    carencia_pontos: input.carenciaPontos,
    expiracao_pontos: input.expiracaoPontos,
  });
}
