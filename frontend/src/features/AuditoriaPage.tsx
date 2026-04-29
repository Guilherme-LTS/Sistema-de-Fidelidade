import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../services/api";
import { toast } from "react-toastify";
import {
  Activity,
  Search,
  AlertCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldAlert,
  CircleX,
  ChartNoAxesCombined
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

type AuditStatus = "SUCESSO" | "FALHA";

type AuditEntry = {
  id: string;
  data_hora: string;
  operator_id?: string | null;
  operator_name?: string | null;
  acao: string;
  detalhes?: string | null;
  status?: AuditStatus;
  alvo?: string | null;
  impacto?: string | null;
  ip?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
};

type AuditSummary = {
  total: number;
  lancamentos: number;
  resgates: number;
  configuracoes: number;
  falhas: number;
};

const DEFAULT_SUMMARY: AuditSummary = {
  total: 0,
  lancamentos: 0,
  resgates: 0,
  configuracoes: 0,
  falhas: 0
};

const EVENT_OPTIONS = [
  { label: "Todos os eventos", value: "" },
  { label: "Lançamento de Pontos", value: "LANCAMENTO_PONTOS" },
  { label: "Resgate de Recompensa", value: "RESGATE_RECOMPENSA" },
  { label: "Alteração de Configurações", value: "ALTERACAO_CONFIGURACOES" },
  { label: "Criação de Recompensa", value: "CRIACAO_RECOMPENSA" },
  { label: "Edição de Recompensa", value: "EDICAO_RECOMPENSA" },
  { label: "Desativação de Recompensa", value: "DESATIVACAO_RECOMPENSA" }
];

const STATUS_OPTIONS = [
  { label: "Todos os status", value: "" },
  { label: "Sucesso", value: "SUCESSO" },
  { label: "Falha", value: "FALHA" }
];

const AuditoriaPage = () => {
  const [log, setLog] = useState<AuditEntry[]>([]);
  const [summary, setSummary] = useState<AuditSummary>(DEFAULT_SUMMARY);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [eventType, setEventType] = useState("");
  const [status, setStatus] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const limparFiltros = () => {
    setBusca("");
    setPeriodoInicio("");
    setPeriodoFim("");
    setEventType("");
    setStatus("");
    setPaginaAtual(1);
  };

  const fetchLog = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10"
      });

      if (busca.trim()) params.append("q", busca.trim());
      if (periodoInicio) params.append("startDate", `${periodoInicio}T00:00:00`);
      if (periodoFim) params.append("endDate", `${periodoFim}T23:59:59`);
      if (eventType) params.append("eventType", eventType);
      if (status) params.append("status", status);

      const response = await api.get(`/admin/auditoria?${params.toString()}`);
      if (response.data && response.data.data) {
        setLog(response.data.data);
        setSummary(response.data.summary || DEFAULT_SUMMARY);
        setTotalPaginas(response.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      toast.error("Erro ao buscar logs de auditoria.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [busca, periodoInicio, periodoFim, eventType, status]);

  useEffect(() => {
    fetchLog(paginaAtual);
  }, [paginaAtual, fetchLog]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, periodoInicio, periodoFim, eventType, status]);

  const formatarData = (dataIso: string) => {
    if (!dataIso) return "N/A";
    const date = new Date(dataIso);
    if (Number.isNaN(date.getTime())) return dataIso;
    return date.toLocaleString("pt-BR");
  };

  const getAcaoLabel = (acao: string) => {
    const map: Record<string, string> = {
      LANCAMENTO_PONTOS: "Lançamento de Pontos",
      RESGATE_RECOMPENSA: "Resgate de Recompensa",
      ALTERACAO_CONFIGURACOES: "Alteração de Configurações",
      CRIACAO_RECOMPENSA: "Criação de Recompensa",
      EDICAO_RECOMPENSA: "Edição de Recompensa",
      DESATIVACAO_RECOMPENSA: "Desativação de Recompensa"
    };
    return map[acao] || acao;
  };

  const getAcaoColor = (acao: string) => {
    if (acao.includes("RESGATE")) return "bg-amber-100 text-amber-800 border-amber-200";
    if (acao.includes("PONTOS")) return "bg-sky-100 text-sky-800 border-sky-200";
    if (acao.includes("CONFIG")) return "bg-green-100 text-green-800 border-green-200";
    if (acao.includes("RECOMPENSA")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    return "bg-slate-100 text-slate-800 border-slate-200";
  };

  const getStatusBadge = (entryStatus?: AuditStatus) => {
    if (entryStatus === "FALHA") {
      return <Badge className="bg-rose-100 text-rose-700 border border-rose-200">Falha</Badge>;
    }
    return <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">Sucesso</Badge>;
  };

  const cards = useMemo(() => [
    { title: "Eventos no período", value: summary.total, icon: <Activity className="h-4 w-4 text-slate-500" /> },
    { title: "Lançamentos", value: summary.lancamentos, icon: <ChartNoAxesCombined className="h-4 w-4 text-sky-500" /> },
    { title: "Resgates", value: summary.resgates, icon: <FileText className="h-4 w-4 text-amber-500" /> },
    { title: "Falhas", value: summary.falhas, icon: <CircleX className="h-4 w-4 text-rose-500" /> }
  ], [summary]);

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto h-full flex flex-col pb-10 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Activity className="h-8 w-8 text-green-600" />
            Auditoria Operacional
          </h2>
          <p className="text-slate-500 mt-1">
            Veja quem executou cada ação, quando e qual foi o impacto no programa de fidelidade.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => fetchLog(paginaAtual)}
          disabled={loading}
          className="flex items-center gap-2 bg-white"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title} className="border-slate-200 shadow-sm">
            <CardContent className="py-5 px-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500">{card.title}</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1">{card.value}</p>
                </div>
                <div>{card.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="flex-1 border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 py-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Histórico de Eventos
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <ShieldAlert className="h-4 w-4" />
                IP técnico disponível apenas no detalhe
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="relative lg:col-span-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por ação, responsável, alvo ou detalhe"
                  className="w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 h-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                />
              </div>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 h-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 lg:col-span-2"
              >
                {EVENT_OPTIONS.map((option) => (
                  <option key={option.value || "all-events"} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 h-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 lg:col-span-2"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || "all-status"} value={option.value}>{option.label}</option>
                ))}
              </select>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:col-span-3">
                <input
                  type="date"
                  value={periodoInicio}
                  onChange={(e) => setPeriodoInicio(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-2 h-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                />
                <input
                  type="date"
                  value={periodoFim}
                  onChange={(e) => setPeriodoFim(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-2 h-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={limparFiltros}
                className="lg:col-span-1 bg-white"
              >
                Limpar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 overflow-auto">
          {loading && log.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-400 mb-4" />
              <p>Carregando histórico...</p>
            </div>
          ) : log.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-900">Nenhum evento encontrado</p>
              <p className="text-sm mt-1">Tente ampliar o período ou remover filtros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white sticky top-0 shadow-sm z-10">
                  <TableRow>
                    <TableHead className="w-[170px] font-semibold text-slate-700">Data/Hora</TableHead>
                    <TableHead className="font-semibold text-slate-700">Evento</TableHead>
                    <TableHead className="font-semibold text-slate-700">Responsável</TableHead>
                    <TableHead className="font-semibold text-slate-700">Alvo</TableHead>
                    <TableHead className="font-semibold text-slate-700">Impacto</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {log.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedEntry(entry);
                        setShowTechnicalDetails(false);
                      }}
                    >
                      <TableCell className="text-xs font-mono text-slate-600 whitespace-nowrap">
                        {formatarData(entry.data_hora)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-medium text-[11px] ${getAcaoColor(entry.acao)}`}>
                          {getAcaoLabel(entry.acao)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-900">
                        {entry.operator_name || <span className="text-slate-400 italic">Sistema</span>}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">
                        {entry.alvo || <span className="text-slate-400">Não informado</span>}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-900">
                        {entry.impacto || <span className="text-slate-400">Sem impacto numérico</span>}
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {totalPaginas > 1 && (
          <div className="border-t border-slate-100 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-slate-500 font-medium">
              Página {paginaAtual} de {totalPaginas}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaAtual((prev) => Math.max(prev - 1, 1))}
                disabled={paginaAtual === 1 || loading}
                className="bg-white"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaAtual((prev) => Math.min(prev + 1, totalPaginas))}
                disabled={paginaAtual === totalPaginas || loading}
                className="bg-white"
              >
                Próxima <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {selectedEntry && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">Detalhes do Evento</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setSelectedEntry(null)}>Fechar</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><span className="text-slate-500">Evento:</span> <span className="font-medium text-slate-900">{getAcaoLabel(selectedEntry.acao)}</span></p>
            <p><span className="text-slate-500">Responsável:</span> <span className="font-medium text-slate-900">{selectedEntry.operator_name || "Sistema"}</span></p>
            <p><span className="text-slate-500">Alvo:</span> <span className="font-medium text-slate-900">{selectedEntry.alvo || "Não informado"}</span></p>
            <p><span className="text-slate-500">Impacto:</span> <span className="font-medium text-slate-900">{selectedEntry.impacto || "Sem impacto numérico"}</span></p>
            <p><span className="text-slate-500">Status:</span> <span className="font-medium text-slate-900">{selectedEntry.status || "SUCESSO"}</span></p>
            <div>
              <p className="text-slate-500 mb-1">Descrição:</p>
              <p className="text-slate-800 bg-slate-50 border border-slate-200 rounded-md p-3">
                {selectedEntry.detalhes || "Sem descrição disponível."}
              </p>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowTechnicalDetails((prev) => !prev)}
                className="text-xs text-green-700 hover:text-green-900 underline"
              >
                {showTechnicalDetails ? "Ocultar detalhes técnicos" : "Mostrar detalhes técnicos"}
              </button>
            </div>

            {showTechnicalDetails && (
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs space-y-1">
                <p><span className="text-slate-500">IP:</span> <span className="text-slate-800">{selectedEntry.ip || "N/A"}</span></p>
                <p><span className="text-slate-500">Entity Type:</span> <span className="text-slate-800">{selectedEntry.entity_type || "N/A"}</span></p>
                <p><span className="text-slate-500">Entity ID:</span> <span className="text-slate-800">{selectedEntry.entity_id || "N/A"}</span></p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AuditoriaPage;

