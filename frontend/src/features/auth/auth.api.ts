import api from '../../services/api';

export async function cadastrarTenant(input: {
  tenantName: string;
  adminName: string;
  email: string;
  password: string;
  document?: string | null;
}) {
  return api.post('/auth/register-tenant', {
    tenant_name: input.tenantName,
    admin_name: input.adminName,
    email: input.email,
    password: input.password,
    document: input.document || null,
  });
}

export async function carregarPerfilAtual() {
  const response = await api.get('/usuarios/me');
  return response.data;
}
