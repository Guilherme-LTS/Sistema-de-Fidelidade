import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Plus, X, Pencil, Ban, CheckCircle, Trash2, Search, UserCog } from 'lucide-react';

interface Usuario {
  id: number;
  supabase_id: string;
  nome: string;
  email: string;
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
  const [searchTerm, setSearchTerm] = useState('');

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
        await api.put(`/admin/usuarios/${editId}`, { nome, role });
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
    if (!window.confirm(`Deseja ${user.ativo ? 'bloquear' : 'desbloquear'} este usuário?`)) return;
    try {
      await api.patch(`/admin/usuarios/${user.id}/status`, { ativo: !user.ativo });
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
      await api.delete(`/admin/usuarios/${id}`);
      toast.success('Usuário excluído!');
      fetchUsuarios();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Erro ao excluir.');
    }
  };

  const filteredUsuarios = usuarios.filter((u) => 
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <UserCog className="h-8 w-8 text-blue-600" />
            Gestão de Usuários
          </h1>
          <p className="text-slate-500 mt-1">Gerencie os acessos ao painel administrativo</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? (
            <>
              <X className="mr-2 h-4 w-4" /> Cancelar
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" /> Novo Funcionário
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card className="border-blue-100 shadow-md">
          <CardHeader>
            <CardTitle>{editId ? 'Editar Funcionário' : 'Cadastrar Novo Funcionário'}</CardTitle>
            <CardDescription>
              {editId ? 'Atualize as informações e permissões do usuário.' : 'Crie um novo acesso preenchendo os dados abaixo.'}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-slate-700">Nome Completo</label>
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: João da Silva"
                    required
                  />
                </div>

                {!editId && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none text-slate-700">E-mail</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ex: joao@restaurante.com"
                      required
                    />
                  </div>
                )}

                {!editId && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none text-slate-700">Senha Provisória</label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-slate-700">Nível de Acesso (Role)</label>
                  <select
                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="operador">Operador (Acesso restrito)</option>
                    <option value="admin">Administrador (Acesso total)</option>
                  </select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4 rounded-b-lg">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Usuários Internos</CardTitle>
              <CardDescription>Lista de todos os funcionários cadastrados.</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Buscar por nome ou email..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center p-8 text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-2"></div>
              Carregando dados...
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Permissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsuarios.map((u) => (
                    <TableRow key={u.id} className={!u.ativo ? "opacity-60 bg-slate-50/50" : ""}>
                      <TableCell className="font-medium">{u.nome}</TableCell>
                      <TableCell className="text-slate-500">{u.email || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'admin' ? "default" : "secondary"} className={u.role === 'admin' ? "bg-purple-600 hover:bg-purple-700" : ""}>
                          {u.role.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.ativo ? (
                          <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-rose-700 border-rose-200 bg-rose-50">
                            Bloqueado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => openEdit(u)} title="Editar">
                          <Pencil className="h-4 w-4 text-slate-600" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => toggleStatus(u)} 
                          title={u.ativo ? 'Bloquear' : 'Desbloquear'}
                        >
                          {u.ativo ? <Ban className="h-4 w-4 text-amber-500" /> : <CheckCircle className="h-4 w-4 text-emerald-500" />}
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleDelete(u.id)} title="Excluir" className="hover:bg-red-50 hover:text-red-600 border-slate-200">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsuarios.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                        {usuarios.length === 0 ? "Nenhum usuário cadastrado." : "Nenhum usuário encontado com a busca atual."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default UsuariosPage;
