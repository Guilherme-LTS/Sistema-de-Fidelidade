import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import useDebounce from '../../hooks/useDebounce';
import api from '../../services/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Gift, Loader2, Info, SearchX } from 'lucide-react';
import { cn } from '../../utils/utils';

function ResgateRecompensa() {
  const [cpf, setCpf] = useState('');
  const [recompensas, setRecompensas] = useState<any[]>([]);
  const [selectedRecompensa, setSelectedRecompensa] = useState('');
  const [carregando, setCarregando] = useState(false);

  const [clienteInfo, setClienteInfo] = useState<any>(null);
  const [buscandoCliente, setBuscandoCliente] = useState(false);

  const debouncedCpf = useDebounce(cpf, 500);

  useEffect(() => {
    const buscarCliente = async () => {
      const cpfLimpo = debouncedCpf.replace(/\D/g, '');
      if (cpfLimpo.length !== 11) {
        setClienteInfo(null);
        return;
      }

      setBuscandoCliente(true);
      setClienteInfo(null);
      try {
        const response = await api.get(`/clientes/${cpfLimpo}`);
        setClienteInfo(response.data);
      } catch (error: any) {
        setClienteInfo({ error: error.response?.data?.error || 'Cliente não encontrado.' });
      } finally {
        setBuscandoCliente(false);
      }
    };

    if (debouncedCpf) {
      buscarCliente();
    }
  }, [debouncedCpf]);

  useEffect(() => {
    const fetchRecompensas = async () => {
      try {
        const response = await api.get(`/recompensas`);
        setRecompensas((response.data || []).map((recompensa: any) => ({
          ...recompensa,
          nome: recompensa?.nome ?? recompensa?.name ?? '',
          points_cost: recompensa?.points_cost ?? recompensa?.custo_pontos ?? 0,
        })));
      } catch (error: any) {
        toast.error(error.message || 'Erro ao carregar recompensas');
      }
    };
    fetchRecompensas();
  }, []);

  const formatarCPF = (valor: string) => {
    return valor.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleResgate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecompensa) {
      toast.warn('Por favor, selecione uma recompensa.');
      return;
    }
    setCarregando(true);
    try {
      const document = cpf.replace(/\D/g, '');
      const rewardId = Number(selectedRecompensa);
      const response = await api.post(`/resgates`, {  
        // Compatibilidade: backend novo usa `document`/`recompensa_id` e legado
        // pode esperar `cpf`/`reward_id`.
        document,
        cpf: document,
        recompensa_id: rewardId,
        reward_id: rewardId,
      });
      const data = response.data;
      
      const pontosRestantes = data?.pontos_restantes ?? data?.remaining_points ?? 0;
      toast.success(`Resgate realizado! Pontos restantes: ${pontosRestantes}`);
      setCpf('');
      setSelectedRecompensa('');
      setClienteInfo(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message);
    } finally {
      setCarregando(false);
    }
  };

  // Encontra a recompensa selecionada para validar se o cliente tem pontos
  const recompensaSelecionadaObj = recompensas.find(r => r.id.toString() === selectedRecompensa);
  const saldoInsuficiente = clienteInfo && !clienteInfo.error && recompensaSelecionadaObj && 
                            clienteInfo.pontosDisponiveis < recompensaSelecionadaObj.points_cost;

  return (
    <Card className="h-full border-green-100 shadow-sm flex flex-col">
      <CardHeader className="bg-green-50/50 border-b border-green-100 pb-4">
        <CardTitle className="text-xl flex items-center gap-2 text-green-800">
          <Gift className="h-5 w-5 text-green-600" />
          Resgatar Recompensa
        </CardTitle>
        <CardDescription>
          Troque pontos do cliente por prêmios do catálogo
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleResgate} className="flex flex-col flex-1">
        <CardContent className="space-y-4 pt-6 flex-1">
          <div className="space-y-2">
            <label htmlFor="cpf-resgate" className="text-sm font-medium leading-none text-slate-700">
              CPF do Cliente
            </label>
            <Input 
              type="text" 
              id="cpf-resgate" 
              value={cpf} 
              onChange={e => setCpf(formatarCPF(e.target.value))} 
              placeholder="000.000.000-00" 
              maxLength={14} 
              required 
              className="text-lg"
            />
            
            <div className="min-h-[2rem] mt-1">
              {buscandoCliente && (
                <div className="flex items-center text-sm text-slate-500">
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Buscando...
                </div>
              )}
              {clienteInfo && !clienteInfo.error && (
                <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 p-2 rounded-md border border-emerald-100">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="block font-medium">{clienteInfo.nome || 'Nome não cadastrado'}</span>
                    <span>Saldo atual: <strong className="font-bold">{clienteInfo.pontosDisponiveis || 0} pts</strong></span>
                  </div>
                </div>
              )}
              {clienteInfo && clienteInfo.error && (
                <div className="flex items-center gap-2 text-sm p-2 rounded-md border text-rose-700 bg-rose-50 border-rose-200">
                  <SearchX className="h-4 w-4 shrink-0" />
                  <span>{clienteInfo.error}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="recompensa-select" className="text-sm font-medium leading-none text-slate-700">
              Selecione a Recompensa
            </label>
            <select 
              id="recompensa-select" 
              className={cn(
                "flex h-11 w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-base ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                saldoInsuficiente ? "border-red-300 focus:ring-red-500" : "border-slate-200"
              )}
              value={selectedRecompensa} 
              onChange={e => setSelectedRecompensa(e.target.value)} 
              required
            >
              <option value="" disabled>-- Escolha uma recompensa --</option>
              {recompensas.map(rec => (
                <option key={rec.id} value={rec.id}>
                  {rec.nome || rec.name} ({rec.points_cost} pontos)
                </option>
              ))}
            </select>
            {saldoInsuficiente && (
              <p className="text-sm text-red-600 font-medium mt-1">Saldo insuficiente para esta recompensa.</p>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="pt-2 pb-6 px-6 mt-auto">
          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700" 
            disabled={
              carregando || 
              (clienteInfo && clienteInfo.error) || 
              !clienteInfo ||
              saldoInsuficiente
            }
          >
            {carregando ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processando...
              </>
            ) : (
              'Confirmar Resgate'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default ResgateRecompensa;