const fs = require('fs');

const code = `import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import styles from './UsuariosPage.module.css';

interface Usuario {
  id: number;
  supabase_id: string;
  nome: string;
  role: string;
  ativo: boolean;
}

function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [editId, setEditId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('operador');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/usuarios');
      setUsuarios(response.data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setNome('');
    setEmail('');
    setPassword('');
    setRole('operador');
    setShowForm(false);
  };

  const openEdit = (user: Usuario) => {
    setEditId(user.id);
    setNome(user.nome);
    setRole(user.role);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome || (!editId && (!email || !password))) {
      toast.warning('Preencha todos os campos obrigatórios.');
      return;
    }

    if (!editId && password.length < 6) {
      toast.warning('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editId) {
        await api.put(\`/admin/usuarios/\${editId}\`, { nome, role });
        toast.success('Usuário atualizado com sucesso!');
      } else {
        await api.post('/admin/usuarios', {
          nome, email, password, role
        });
        toast.success('Usuário criado com sucesso!');
      }
      resetForm();
      fetchUsuarios();
    } catch (error: any) {
      console.error(error);
      const mensagem = error.response?.data?.error || 'Erro na operação.';
      toast.error(mensagem);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (user: Usuario) => {
    if (!window.confirm(\`Deseja \${user.ativo ? 'bloquear' : 'desbloquear'} este usuário?\`)) return;
    try {
      await api.patch(\`/admin/usuarios/\${user.id}/status\`, { ativo: !user.ativo });
      toast.success(user.ativo ? 'Usuário bloqueado com sucesso!' : 'Usuário desbloqueado com sucesso!');
      fetchUsuarios();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Erro ao alterar status.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('CUIDADO: Tem certeza que deseja excluir permanentemente este usuário?')) return;
    try {
      await api.delete(\`/admin/usuarios/\${id}\`);
      toast.success('Usuário excluído!');
      fetchUsuarios();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Erro ao excluir.');
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Gestão de Usuários Internos</h1>
        <button className={styles.buttonNew} onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? 'Fechar Formulário' : '+ Novo Funcionário'}
        </button>
      </div>

      {showForm && (
        <div className={styles.panelForm}>
          <h2 className={styles.subTitle}>{editId ? 'Editar Funcionário' : 'Cadastrar Novo Funcionário'}</h2>

          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nome Completo</label>
              <input
                type="text"
                className={styles.input}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João da Silva"
                required
              />
            </div>

            {!editId && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>E-mail</label>
                  <input
                    type="email"
                    className={styles.input}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: joao@restaurante.com"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Senha Provisória</label>
                  <input
                    type="password"
                    className={styles.input}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    required
                  />
                </div>
              </>
            )}

            <div className={styles.formGroup}>
              <label className={styles.label}>Nível de Acesso (Role)</label>
              <select
                className={styles.select}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="operador">Operador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className={styles.actions}>
              <button type="submit" className={styles.button} disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" className={styles.buttonCancel} onClick={resetForm}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={styles.panel}>
        <h2 className={styles.subTitle}>Lista de Funcionários</h2>
        {loading ? (
          <p>Carregando...</p>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Permissão</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className={!u.ativo ? styles.inactiveRow : ''}>
                    <td>{u.nome}</td>
                    <td>
                      <span className={u.role === 'admin' ? styles.badgeAdmin : styles.badgeOperador}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={u.ativo ? styles.badgeActive : styles.badgeInactive}>
                        {u.ativo ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className={styles.actionCells}>
                      <button className={styles.btnAction} onClick={() => openEdit(u)} title="Editar">✏️</button>
                      <button className={styles.btnAction} onClick={() => toggleStatus(u)} title={u.ativo ? 'Bloquear' : 'Desbloquear'}>
                        {u.ativo ? '🚫' : '✅'}
                      </button>
                      <button className={styles.btnAction + ' ' + styles.btnDelete} onClick={() => handleDelete(u.id)} title="Excluir">
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
                {usuarios.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '1rem' }}>
                      Nenhum usuário cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default UsuariosPage;
`;

fs.writeFileSync('C:/Users/Gui/Documents/GitHub/Sistema-de-Fidelidade/frontend/src/features/usuarios/UsuariosPage.tsx', code, 'utf8');
