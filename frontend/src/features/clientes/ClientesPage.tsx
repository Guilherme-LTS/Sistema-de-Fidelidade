import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import useDebounce from '../../hooks/useDebounce';
import Spinner from '../../shared/components/Spinner';
import Pagination from '../../shared/components/Pagination';
import api from '../../services/api';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Search, Users as UsersIcon, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/utils';

const formatarData = (dataISO: string) => {
  if (!dataISO) return '';
  const data = new Date(dataISO);
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

interface Cliente {
  id: number;
  nome: string;
  document: string;
  pontosDisponiveis?: number;
  pontosPendentes?: number;
}

interface ExtratoItem {
  data: string;
  descricao: string;
  pontos: number;
  tipo: 'credito' | 'debito';
}

function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [termoBusca, setTermoBusca] = useState('');
  const debouncedBusca = useDebounce(termoBusca, 500);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [extrato, setExtrato] = useState<ExtratoItem[]>([]);
  const [loadingExtrato, setLoadingExtrato] = useState(false);

  useEffect(() => {
    const fetchClientes = async () => {
      setLoading(true);
      try {
        const url = `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/clientes?busca=${debouncedBusca}&page=${paginaAtual}`;
        const basePath = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const response = await api.get(url.replace(basePath, ''));
        const data = response.data;
        setClientes(data.clientes || []); 
        setTotalPaginas(data.totalPaginas || 1);

      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchClientes();
  }, [debouncedBusca, paginaAtual]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [debouncedBusca]);

  const handleSelecionarCliente = async (cliente: Cliente) => {
    setLoadingExtrato(true);
    setClienteSelecionado(cliente);
    setExtrato([]);
    const cpfLimpo = cliente.document.replace(/\D/g, '');

    try {
      const [resCliente, resExtrato] = await Promise.all([
        api.get(`/clientes/${cpfLimpo}`),
        api.get(`/clientes/${cpfLimpo}/extrato`)
      ]);

      setClienteSelecionado(resCliente.data);
      setExtrato(resExtrato.data);

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoadingExtrato(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <UsersIcon className="h-8 w-8 text-blue-600" />
            Clientes
          </h1>
          <p className="text-slate-500 mt-1">Busque e consulte o extrato de pontos dos clientes</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            id="busca-cliente"
            type="text"
            className="pl-9"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar por nome ou CPF..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)] min-h-[600px]">
        {/* Lista de Clientes - 4 Colunas */}
        <Card className="lg:col-span-4 flex flex-col h-full overflow-hidden">
          <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-lg">Resultados da Busca</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {loading ? (
              <div className="flex justify-center items-center h-40 text-slate-500">
                <Spinner />
              </div>
            ) : (
              <>
                {clientes.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">
                    Nenhum cliente encontrado para essa busca.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {clientes.map(cliente => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() => handleSelecionarCliente(cliente)}
                        className={cn(
                          "w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group",
                          clienteSelecionado?.id === cliente.id ? "bg-blue-50 hover:bg-blue-50 border-l-4 border-l-blue-600" : "border-l-4 border-l-transparent"
                        )}
                      >
                        <div>
                          <div className={cn("font-medium", clienteSelecionado?.id === cliente.id ? "text-blue-700" : "text-slate-900")}>
                            {cliente.nome || 'Nome não cadastrado'}
                          </div>
                          <div className="text-sm text-slate-500">{cliente.document}</div>
                        </div>
                        <ChevronRight className={cn(
                          "h-5 w-5 text-slate-300 group-hover:text-blue-500 transition-colors",
                          clienteSelecionado?.id === cliente.id ? "text-blue-600" : ""
                        )} />
                      </button>
                    ))}
                  </div>
                )}
                <div className="p-4 border-t border-slate-100 mt-auto bg-white sticky bottom-0">
                  <Pagination 
                    paginaAtual={paginaAtual}
                    totalPaginas={totalPaginas}
                    onPageChange={setPaginaAtual}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Detalhes do Cliente - 8 Colunas */}
        <Card className="lg:col-span-8 flex flex-col h-full overflow-hidden">
          {loadingExtrato ? (
            <div className="flex justify-center items-center h-full text-slate-500">
              <Spinner />
            </div>
          ) : (
            clienteSelecionado ? (
              <div className="flex flex-col h-full">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-6">
                  <CardTitle className="text-2xl">{clienteSelecionado.nome || `CPF ${clienteSelecionado.document}`}</CardTitle>
                  <CardDescription>Visualizando extrato consolidado do cliente</CardDescription>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-center">
                      <span className="text-sm text-slate-500 font-medium">Pontos Disponíveis</span>
                      <span className="text-3xl font-bold text-emerald-600">
                        {clienteSelecionado.pontosDisponiveis ?? 0}
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-center">
                      <span className="text-sm text-slate-500 font-medium">Pontos Pendentes</span>
                      <span className="text-3xl font-bold text-amber-500">
                        {clienteSelecionado.pontosPendentes ?? 0}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 overflow-y-auto p-0">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-slate-900 mb-4">Extrato Completo</h3>
                    
                    {extrato.length === 0 ? (
                      <div className="text-center p-8 text-slate-500 border rounded-lg bg-slate-50 border-dashed">
                        Este cliente ainda não possui movimentações no extrato.
                      </div>
                    ) : (
                      <div className="border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead className="text-right">Pontos</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {extrato.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell className="whitespace-nowrap">{formatarData(item.data)}</TableCell>
                                <TableCell>{item.descricao}</TableCell>
                                <TableCell className={cn(
                                  "text-right font-medium",
                                  item.tipo === 'credito' ? "text-emerald-600" : "text-red-500"
                                )}>
                                  {item.tipo === 'credito' ? `+${item.pontos}` : `-${item.pontos}`}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 h-full min-h-[400px]">
                <UsersIcon className="h-16 w-16 mb-4 text-slate-200" />
                <p className="text-lg text-slate-500 font-medium">Nenhum cliente selecionado</p>
                <p className="text-sm text-slate-400 max-w-sm text-center mt-2">
                  Selecione um cliente na lista ao lado ou faça uma busca para ver seus detalhes e extrato de pontos.
                </p>
              </div>
            )
          )}
        </Card>
      </div>
    </div>
  );
}

export default ClientesPage;
