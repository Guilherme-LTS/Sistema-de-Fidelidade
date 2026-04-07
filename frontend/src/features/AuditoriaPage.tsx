import React, { useState, useEffect } from "react";
import api from "../services/api";
import { toast } from "react-toastify";
import { Activity, Search, AlertCircle, FileText, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

const AuditoriaPage = () => {
  const [log, setLog] = useState<any[]>([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchLog = async (page: number) => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/auditoria?page=${page}&limit=10`);
      if (response.data && response.data.data) {
        setLog(response.data.data);
        setTotalPaginas(response.data.pagination.totalPages);
      }
    } catch (error) {
      toast.error("Erro ao buscar logs de auditoria.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLog(paginaAtual);
  }, [paginaAtual]);

  const getAcaoColor = (acao: string) => {
    if (acao.includes("LOGIN")) return "bg-blue-100 text-blue-800 border-blue-200";
    if (acao.includes("CADASTRO")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (acao.includes("RESGATE") || acao.includes("DESCONTO")) return "bg-amber-100 text-amber-800 border-amber-200";
    if (acao.includes("PONTOS") || acao.includes("CREDITO")) return "bg-purple-100 text-purple-800 border-purple-200";
    if (acao.includes("ERRO") || acao.includes("FALHA")) return "bg-red-100 text-red-800 border-red-200";
    if (acao.includes("EXCLUSAO") || acao.includes("DELETE")) return "bg-slate-800 text-slate-100 border-slate-900";
    return "bg-slate-100 text-slate-800 border-slate-200";
  };

  const formatarData = (dataIso: string) => {
    try {
      return new Date(dataIso).toLocaleString("pt-BR");
    } catch {
      return dataIso;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Activity className="h-8 w-8 text-indigo-600" />
            Auditoria / Logs
          </h2>
          <p className="text-slate-500 mt-1">
            Rastreamento detalhado de transações e acesso às contas do sistema.
          </p>
        </div>
        
        <Button 
          variant="outline" 
          onClick={() => fetchLog(paginaAtual)}
          disabled={loading}
          className="flex items-center gap-2 bg-white"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Logs
        </Button>
      </div>

      <Card className="flex-1 border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-500" />
              Registro de Operações
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              </span>
              Monitoramento Ativo
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 flex-1 overflow-auto">
          {loading && log.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-400 mb-4" />
              <p>Carregando registros de auditoria...</p>
            </div>
          ) : log.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-900">Nenhum log encontrado</p>
              <p className="text-sm mt-1">Nenhuma operação foi registrada no sistema ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white sticky top-0 shadow-sm z-10">
                  <TableRow>
                    <TableHead className="w-[180px] font-semibold text-slate-700">Data/Hora</TableHead>
                    <TableHead className="font-semibold text-slate-700">Usuário</TableHead>
                    <TableHead className="font-semibold text-slate-700">Ação / Evento</TableHead>
                    <TableHead className="font-semibold text-slate-700 max-w-md">Detalhes Registrados</TableHead>
                    <TableHead className="w-[140px] font-semibold text-slate-700 text-right">IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {log.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="text-xs font-mono text-slate-600 whitespace-nowrap">
                        {formatarData(entry.data_hora)}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">
                        {entry.operator_id || <span className="text-slate-400 italic">Sistema</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-medium uppercase tracking-wider text-[10px] sm:text-xs ${getAcaoColor(entry.acao)}`}>
                          {entry.acao}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 max-w-md truncate" title={entry.detalhes}>
                        {entry.detalhes}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-500 text-right">
                        {entry.ip || "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        
        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="border-t border-slate-100 bg-slate-50 p-4 flex items-center justify-between">
            <p className="text-sm text-slate-500 font-medium">
              Página {paginaAtual} de {totalPaginas}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))}
                disabled={paginaAtual === 1 || loading}
                className="bg-white"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))}
                disabled={paginaAtual === totalPaginas || loading}
                className="bg-white"
              >
                Próxima <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditoriaPage;

