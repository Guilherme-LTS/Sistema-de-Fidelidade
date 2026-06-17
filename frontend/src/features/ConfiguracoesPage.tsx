import React, { useState, useEffect } from "react";
import { Sliders, Clock, History, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "react-toastify";
import { carregarConfiguracoesTenant, salvarConfiguracoesTenant } from "./configuracoes/configuracoes.api";

const ConfiguracoesPage = () => {
  const [carenciaInput, setCarenciaInput] = useState<string>('0');
  const [expiracaoInput, setExpiracaoInput] = useState<string>('180');
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    try {
      setLoading(true);
      const data = await carregarConfiguracoesTenant();
      if (data.configs?.carencia_pontos) {
        setCarenciaInput(String(data.configs.carencia_pontos.valor));
      }
      if (data.configs?.expiracao_pontos) {
        setExpiracaoInput(String(data.configs.expiracao_pontos.valor));
      }
      setLastUpdate(data.lastUpdate ? new Date(data.lastUpdate).toLocaleString('pt-BR') : null);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações do sistema.');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const carencia = Number(carenciaInput);
    const expiracao = Number(expiracaoInput);

    if (carenciaInput.trim() === '' || expiracaoInput.trim() === '') {
      toast.warning('Preencha os dois campos antes de salvar.');
      return;
    }
    if (!Number.isInteger(carencia) || !Number.isInteger(expiracao)) {
      toast.warning('Informe apenas valores inteiros em dias.');
      return;
    }
    if (carencia < 0) {
      toast.warning('O prazo de carência não pode ser negativo.');
      return;
    }
    if (expiracao <= 0) {
      toast.warning('O prazo de expiração deve ser de pelo menos 1 dia.');
      return;
    }

    try {
      setSaving(true);
      await salvarConfiguracoesTenant({ carenciaPontos: carencia, expiracaoPontos: expiracao });
      toast.success('Configurações atualizadas com sucesso!');
      await carregarConfiguracoes();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao atualizar configurações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Sliders className="h-8 w-8 text-indigo-600" />
          Configurações de Regras
        </h2>
        <p className="text-slate-500 mt-1">
          Gerencie as regras de validade e liberação de pontos para os clientes.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-800">Estados de Pontos</CardTitle>
          <CardDescription>
            O dashboard considera três estados: pendentes, disponíveis e resgatados.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900">Pontos Pendentes</p>
            <p className="text-xs text-amber-800 mt-1">Lançados e ainda em carência, sem uso permitido.</p>
          </div>
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
            <p className="text-sm font-semibold text-indigo-900">Pontos Disponíveis</p>
            <p className="text-xs text-indigo-800 mt-1">Já liberados para resgate e dentro da validade.</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-sm font-semibold text-emerald-900">Pontos Resgatados</p>
            <p className="text-xs text-emerald-800 mt-1">Consumidos em recompensas e registrados no histórico.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <form onSubmit={handleSalvar}>
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">
              Controle de Pontos
            </CardTitle>
            <CardDescription>
              Defina quando os pontos ficarão disponíveis e quando irão expirar.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-6">
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Prazo de Carência (Dias)
                  </label>
                  <div className="flex gap-4">
                    <div className="relative flex-1 max-w-[200px]">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Clock className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="number"
                        min="0"
                        className="pl-10 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={carenciaInput}
                        onChange={(e) => setCarenciaInput(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 max-w-2xl">
                    Dias que os pontos ficarão retidos após a compra antes de serem liberados para resgate. Útil para evitar resgates imediatos em caso de estorno ou cancelamento de compra. <br/><span className="text-slate-700 font-medium">Use 0 para liberação imediata.</span>
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-6 space-y-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Prazo de Expiração (Dias)
                  </label>
                  <div className="flex gap-4">
                    <div className="relative flex-1 max-w-[200px]">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <History className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="number"
                        min="1"
                        className="pl-10 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={expiracaoInput}
                        onChange={(e) => setExpiracaoInput(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 max-w-2xl">
                    Dias que o cliente tem para utilizar os pontos <span className="font-medium text-slate-700">após a liberação (carência)</span>. Quando este prazo for atingido, o saldo da transação será irreversivelmente expirado.
                  </p>
                  <p className="text-xs text-slate-500">
                    Escopo atual: regras globais do sistema. Estrutura preparada para evolução futura por restaurante sem alterar o comportamento atual.
                  </p>
                </div>
              </>
            )}
          </CardContent>

          <CardFooter className="bg-slate-50 border-t border-slate-100 flex items-center justify-between py-4">
            <div className="text-xs text-slate-500 flex items-center gap-1">
              {lastUpdate ? (
                <>Atualizado pela última vez em: <span className="font-medium">{lastUpdate}</span></>
              ) : (
                'Essas regras se aplicam a novos pontos gerados.'
              )}
            </div>
            <Button
              type="submit"
              disabled={loading || saving}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? (
                <span className="flex items-center gap-2">Salvar...</span>
              ) : (
                <span className="flex items-center gap-2"><Check className="h-4 w-4" /> Salvar Configurações</span>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ConfiguracoesPage;
