import api from '../../services/api';

export interface Usuario {
  id: string;
  supabase_id: string;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
}

type UsuarioApi = {
  id: string;
  supabase_id?: string;
  user_id?: string;
  nome?: string;
  name?: string;
  email?: string;
  role?: string;
  ativo?: boolean;
  is_active?: boolean;
};

export type UsuarioPayload = {
  nome: string;
  email: string;
  role: string;
};

const normalizeUsuario = (row: UsuarioApi): Usuario => ({
  id: String(row.id),
  supabase_id: row.supabase_id || row.user_id || '',
  nome: row.nome || row.name || '',
  email: row.email || '',
  role: row.role || 'operador',
  ativo: typeof row.ativo === 'boolean' ? row.ativo : Boolean(row.is_active),
});

export async function listarUsuarios() {
  const response = await api.get('/admin/usuarios');
  return (response.data as UsuarioApi[]).map(normalizeUsuario);
}

export async function salvarUsuario(payload: UsuarioPayload, id?: string | null) {
  if (id) {
    return api.put(`/admin/usuarios/${id}`, payload);
  }

  return api.post('/admin/usuarios', payload);
}

export async function alterarStatusUsuario(id: string, ativo: boolean) {
  return api.patch(`/admin/usuarios/${id}/status`, { ativo });
}

export async function excluirUsuario(id: string) {
  return api.delete(`/admin/usuarios/${id}`);
}
