import React, { useState, useEffect } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";
import { 
  Users, 
  Gift, 
  ArrowRightLeft, 
  CreditCard,
  TrendingUp,
  Activity,
  Award,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

interface StatsProps {
  totalClientes: number;
  pontosPendentes: number;
  pontosDisponiveis: number;
  pontosResgatados: number;
  recentes: any[];
  chartData: any[];
}

const Dashboard = () => {
  const [stats, setStats] = useState<StatsProps>({
    totalClientes: 0,
    pontosPendentes: 0,
    pontosDisponiveis: 0,
    pontosResgatados: 0,
    recentes: [],
    chartData: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        setStats(response.data);
      } catch (err: any) {
        console.error("Erro ao carregar os dados:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Dados vindos da API
  const chartData = stats.chartData || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col pb-4 overflow-hidden">
      <div className="shrink-0">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Activity className="h-8 w-8 text-indigo-600" />
          Visão Geral
        </h2>
        <p className="text-slate-500 mt-1">
          Acompanhe o desempenho do seu programa de fidelidade em tempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 shrink-0">
        {/* Total Clientes */}
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-white">
            <CardTitle className="text-sm font-medium text-slate-600">Total de Clientes</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="bg-white">
            <div className="text-2xl font-bold text-slate-900">{stats.totalClientes.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-500 font-medium">+12%</span> desde o mês passado
            </p>
          </CardContent>
        </Card>

        {/* Pontos Pendentes */}
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-white">
            <CardTitle className="text-sm font-medium text-slate-600">Pontos Pendentes</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <Award className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="bg-white">
            <div className="text-2xl font-bold text-slate-900">{stats.pontosPendentes.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              No período de carência
            </p>
          </CardContent>
        </Card>

        {/* Pontos Disponiveis */}
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-white">
            <CardTitle className="text-sm font-medium text-slate-600">Pontos Disponíveis</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="bg-white">
            <div className="text-2xl font-bold text-slate-900">{stats.pontosDisponiveis.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              Prontos para resgate
            </p>
          </CardContent>
        </Card>

        {/* Resgates */}
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-white">
            <CardTitle className="text-sm font-medium text-slate-600">Pontos Resgatados</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <Gift className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="bg-white">
            <div className="text-2xl font-bold text-slate-900">{stats.pontosResgatados.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              Já utilizados em prêmios
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 flex-1 min-h-0">
        {/* Gráfico */}
        <Card className="col-span-1 lg:col-span-4 border-slate-200 shadow-sm flex flex-col min-h-0">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 shrink-0">
            <CardTitle className="text-base font-semibold text-slate-800">Fluxo de Pontos (Últimos 7 dias)</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex-1 min-h-0">
            <div className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPontos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorResgates" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="pontos" name="Pontos Gerados" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorPontos)" />
                  <Area type="monotone" dataKey="resgates" name="Pontos Resgatados" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorResgates)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Melhores Clientes */}
        <Card className="col-span-1 lg:col-span-3 border-slate-200 shadow-sm flex flex-col min-h-0">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 shrink-0">
            <CardTitle className="text-base font-semibold text-slate-800 flex justify-between items-center">
              Top Clientes
              <Link to="/admin/clientes" className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center">
                Ver todos <ChevronRight className="h-3 w-3 ml-1" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto min-h-0">
            <div className="divide-y divide-slate-100">
              {stats.recentes && stats.recentes.length > 0 ? (
                stats.recentes.map((cliente: any, idx: number) => (
                  <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-semibold text-slate-600">
                        {cliente.nome ? cliente.nome.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">
                          {cliente.nome || 'Cliente Anônimo'}
                        </span>
                        <span className="text-xs text-slate-500">{cliente.cpf}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        {cliente.saldo_pontos || 0} pts
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                [1,2,3,4,5].map((i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 animate-pulse"></div>
                      <div className="space-y-2">
                        <div className="h-4 w-24 bg-slate-100 rounded animate-pulse"></div>
                        <div className="h-3 w-32 bg-slate-50 rounded animate-pulse"></div>
                      </div>
                    </div>
                    <div className="h-6 w-16 bg-slate-100 rounded animate-pulse"></div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
