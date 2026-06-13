import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  alterarStatusUsuario,
  excluirUsuario,
  listarUsuarios,
  salvarUsuario,
  Usuario,
} from './usuarios.api';

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
import { Plus, X, Pencil, Ban, CheckCircle, Trash2, Search, UserCog, Eye, EyeOff, Copy, Shuffle } from 'lucide-react';

const generateTemporaryPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%';
  const bytes = new Uint32Array(12);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
};

function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [role, setRole] = useState('operador');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      setUsuarios(await listarUsuarios());
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
    setSenha('');
    setShowSenha(false);
    setRole('operador');
    setShowForm(false);
  };

  const openEdit = (user: Usuario) => {
    setEditId(user.id);
    setNome(user.nome || '');
    setEmail(user.email || '');
    setSenha('');
    setShowSenha(false);
    setRole(user.role);
    setShowForm(true);
  };

  const handleGeneratePassword = () => {
    const generated = generateTemporaryPassword();
    setSenha(generated);
    setShowSenha(true);
    toast.info('Senha temporária gerada. Copie e envie ao funcionário por um canal seguro.');
  };

  const handleCopyPassword = async () => {
    if (!senha) {
      toast.warning('Gere ou informe uma senha temporária primeiro.');
      return;
    }

    try {
      await navigator.clipboard.writeText(senha);
      toast.success('Senha temporária copiada.');
    } catch {
      toast.error('Não foi possível copiar a senha automaticamente.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome || !email || (!editId && senha.length < 6)) {
      toast.warning('Preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editId) {
        await salvarUsuario({ nome, email, role }, editId);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        await salvarUsuario({ nome, email, role, senha });
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

  const openStatusModal = (user: Usuario) => {
    setSelectedUser(user);
    setStatusModalOpen(true);
  };

  const openDeleteModal = (user: Usuario) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  const closeStatusModal = () => {
    if (isStatusSubmitting) return;
    setStatusModalOpen(false);
    setSelectedUser(null);
  };

  const closeDeleteModal = () => {
    if (isDeleteSubmitting) return;
    setDeleteModalOpen(false);
    setSelectedUser(null);
  };

  const toggleStatus = async () => {
    if (!selectedUser) return;
    setIsStatusSubmitting(true);
    try {
      await alterarStatusUsuario(selectedUser.id, !selectedUser.ativo);
      toast.success(selectedUser.ativo ? 'Usuário bloqueado com sucesso!' : 'Usuário desbloqueado com sucesso!');
      fetchUsuarios();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Erro ao alterar status.');
    } finally {
      setIsStatusSubmitting(false);
      closeStatusModal();
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setIsDeleteSubmitting(true);
    try {
      await excluirUsuario(selectedUser.id);
      toast.success('Usuário excluído!');
      fetchUsuarios();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Erro ao excluir.');
    } finally {
      setIsDeleteSubmitting(false);
      closeDeleteModal();
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredUsuarios = usuarios.filter((u) => {
    if (!normalizedSearch) return true;
    const nomeSafe = (u.nome || '').toLowerCase();
    const emailSafe = (u.email || '').toLowerCase();
    const roleSafe = (u.role || '').toLowerCase();
    return (
      nomeSafe.includes(normalizedSearch) ||
      emailSafe.includes(normalizedSearch) ||
      roleSafe.includes(normalizedSearch)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-stone-900">
            <UserCog className="h-8 w-8 text-teal-600" />
            Gestão de Usuários
          </h1>
          <p className="mt-1 text-stone-500">Gerencie os acessos ao painel administrativo</p>
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
        <Card className="border-stone-200 shadow-md">
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
                  <label className="text-sm font-medium leading-none text-stone-700">Nome Completo</label>
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: João da Silva"
                    required
                  />
                </div>

                {!editId && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium leading-none text-stone-700">Senha temporária</label>
                      <Button type="button" variant="ghost" size="sm" onClick={handleGeneratePassword}>
                        <Shuffle className="mr-2 h-3.5 w-3.5" />
                        Gerar
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type={showSenha ? 'text' : 'password'}
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        placeholder="Mínimo de 6 caracteres"
                        minLength={6}
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowSenha((current) => !current)}
                        title={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleCopyPassword}
                        title="Copiar senha temporária"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs leading-relaxed text-stone-500">
                      O funcionário usará esta senha no primeiro login. Oriente-o a alterá-la em seguida.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-stone-700">E-mail</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: joao@restaurante.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-stone-700">Nível de Acesso (Role)</label>
                  <select
                    className="flex h-10 w-full items-center justify-between rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 ring-offset-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="operador">Operador (Acesso restrito)</option>
                    <option value="admin">Administrador (Acesso total)</option>
                  </select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t border-stone-100 bg-stone-50 p-4 rounded-b-lg">
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
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500" />
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
            <div className="flex items-center justify-center p-8 text-stone-500">
              <div className="mr-2 h-8 w-8 animate-spin rounded-full border-b-2 border-teal-600"></div>
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
                    <TableRow key={u.id} className={!u.ativo ? 'opacity-60 bg-stone-50/50' : ''}>
                      <TableCell className="font-medium">{u.nome || '-'}</TableCell>
                      <TableCell className="text-stone-500">{u.email || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className={u.role === 'admin' ? 'bg-teal-600 hover:bg-teal-700' : 'border-stone-200 text-stone-700'}>
                          {(u.role || 'operador').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.ativo ? (
                          <Badge variant="success">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            Bloqueado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => openEdit(u)} title="Editar">
                          <Pencil className="h-4 w-4 text-stone-600" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => openStatusModal(u)} 
                          title={u.ativo ? 'Bloquear' : 'Desbloquear'}
                        >
                          {u.ativo ? <Ban className="h-4 w-4 text-amber-600" /> : <CheckCircle className="h-4 w-4 text-success-600" />}
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => openDeleteModal(u)} title="Excluir" className="border-stone-200 hover:bg-danger-50 hover:text-danger-600">
                          <Trash2 className="h-4 w-4 text-danger-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsuarios.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-stone-500">
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

      {statusModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--color-overlay)] backdrop-blur-sm p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl">
            <div className="border-b border-stone-100 bg-stone-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-stone-900">
                {selectedUser.ativo ? 'Bloquear usuário' : 'Desbloquear usuário'}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-stone-700">
                Você está prestes a {selectedUser.ativo ? 'bloquear' : 'desbloquear'} o usuário <span className="font-semibold">{selectedUser.nome}</span>.
              </p>
              <p className="text-sm text-stone-500">
                Confirme para continuar ou cancele para voltar.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-stone-100 bg-stone-50 px-6 py-4">
              <Button type="button" variant="outline" onClick={closeStatusModal} disabled={isStatusSubmitting}>
                Cancelar
              </Button>
              <Button type="button" onClick={toggleStatus} disabled={isStatusSubmitting} className="bg-amber-600 text-white hover:bg-amber-700">
                {isStatusSubmitting ? 'Processando...' : selectedUser.ativo ? 'Bloquear' : 'Desbloquear'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--color-overlay)] backdrop-blur-sm p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl">
            <div className="border-b border-stone-100 bg-stone-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-danger-600">Excluir usuário permanentemente</h2>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-stone-700">
                Essa ação é irreversível. O usuário <span className="font-semibold">{selectedUser.nome}</span> será removido do acesso operacional do restaurante.
              </p>
              <p className="text-sm text-stone-500">
                Confirme apenas se tiver certeza.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-stone-100 bg-stone-50 px-6 py-4">
              <Button type="button" variant="outline" onClick={closeDeleteModal} disabled={isDeleteSubmitting}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleDelete} disabled={isDeleteSubmitting} className="bg-danger-600 text-white hover:bg-danger-700">
                {isDeleteSubmitting ? 'Excluindo...' : 'Excluir definitivamente'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsuariosPage;
