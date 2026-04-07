import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import Spinner from '../../shared/components/Spinner';
import api from '../../services/api';

import {
  Card,
  CardContent,
  CardDescription,
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
import { Input } from '../../components/ui/input';
import { Gift, Plus, Pencil, Trash2, X } from 'lucide-react';

interface Recompensa {
  id: number;
  nome: string;
  descricao: string;
  points_cost: string | number;
}

function PremiosPage() {
  const [recompensas, setRecompensas] = useState<Recompensa[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecompensa, setCurrentRecompensa] = useState<Recompensa>({ 
    id: 0, 
    nome: '', 
    descricao: '', 
    points_cost: '' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRecompensas = useCallback(async () => {
    try {
      const { data } = await api.get('/recompensas'); 
      setRecompensas(data);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar recompensas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecompensas();
  }, [fetchRecompensas]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleCloseModal();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  const handleOpenModal = (recompensa: Recompensa | null = null) => {
    if (recompensa) {
      setIsEditing(true);
      setCurrentRecompensa({ ...recompensa });
    } else {
      setIsEditing(false);
      setCurrentRecompensa({ id: 0, nome: '', descricao: '', points_cost: '' });
    }
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentRecompensa(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const dadosParaEnviar: any = { ...currentRecompensa };

    if (!isEditing) {
      delete dadosParaEnviar.id;
    }

    try {
      if (isEditing) {
        await api.put(`/recompensas/${dadosParaEnviar.id}`, dadosParaEnviar);
      } else {
        await api.post(`/recompensas`, dadosParaEnviar);
      }
      
      toast.success(`Recompensa ${isEditing ? 'atualizada' : 'criada'} com sucesso!`);
      fetchRecompensas();
      handleCloseModal();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar recompensa');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta recompensa?')) {
      try {
        await api.delete(`/recompensas/${id}`);
        toast.success('Recompensa excluída com sucesso!');
        fetchRecompensas();
      } catch (error: any) {
        toast.error(error.response?.data?.error || error.message || 'Erro ao excluir recompensa');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-500">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Gift className="h-8 w-8 text-blue-600" />
            Catálogo de Recompensas
          </h1>
          <p className="text-slate-500 mt-1">Configure os prêmios disponíveis para resgate</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Novo Prêmio
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4 border-b border-slate-100">
          <CardTitle>Recompensas Disponíveis</CardTitle>
          <CardDescription>Lista de todos os prêmios cadastrados no sistema.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border border-t-0 rounded-b-md shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-1/3">Prêmio</TableHead>
                  <TableHead className="w-1/3">Descrição</TableHead>
                  <TableHead>Custo (Pts)</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recompensas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                      Nenhum prêmio cadastrado ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  recompensas.map(rec => (
                    <TableRow key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-medium">{rec.nome}</TableCell>
                      <TableCell className="text-slate-500">{rec.descricao || '-'}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">
                          {rec.points_cost} pts
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleOpenModal(rec)} 
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4 text-slate-600" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleDelete(rec.id)} 
                          title="Excluir" 
                          className="hover:bg-red-50 hover:text-red-600 border-slate-200"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Overlay and Content */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-semibold text-slate-900">
                {isEditing ? 'Editar Prêmio' : 'Adicionar Novo Prêmio'}
              </h2>
              <button 
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor="premio-nome" className="text-sm font-medium leading-none text-slate-700">
                  Nome do Prêmio <span className="text-red-500">*</span>
                </label>
                <Input 
                  id="premio-nome"
                  type="text" 
                  name="nome" 
                  value={currentRecompensa.nome} 
                  onChange={handleChange} 
                  placeholder="Ex: Sobremesa Especial"
                  required 
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="premio-descricao" className="text-sm font-medium leading-none text-slate-700">
                  Descrição (Opcional)
                </label>
                <Input 
                  id="premio-descricao"
                  type="text" 
                  name="descricao" 
                  value={currentRecompensa.descricao} 
                  onChange={handleChange} 
                  placeholder="Ex: Válido para qualquer sobremesa do cardápio"
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="premio-custo" className="text-sm font-medium leading-none text-slate-700">
                  Custo (em Pontos) <span className="text-red-500">*</span>
                </label>
                <Input 
                  id="premio-custo"
                  type="number" 
                  name="points_cost" 
                  value={currentRecompensa.points_cost} 
                  onChange={handleChange} 
                  required 
                  min="1"
                  placeholder="Ex: 50"
                  className="w-full"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <Button type="button" variant="outline" onClick={handleCloseModal}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Salvar Prêmio'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PremiosPage;
