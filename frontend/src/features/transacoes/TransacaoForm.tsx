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
import { PlusCircle, Loader2, UserPlus, Info } from 'lucide-react';
import { cn } from '../../utils/utils';

function TransacaoForm() {
  const [cpf, setCpf] = useState('');
  const [valor, setValor] = useState('');
  const [nome, setNome] = useState('');
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
        if (error.response?.status === 404) {
          setClienteInfo({ isNew: true, error: 'Novo cliente será cadastrado' });
        } else {
          setClienteInfo({ error: 'Erro ao buscar cliente' });
        }
      } finally {
        setBuscandoCliente(false);
      }
    };

    if (debouncedCpf) {
      buscarCliente();
    }
  }, [debouncedCpf]);

  const formatarCPF = (valor: string) => {
    const cpfLimpo = valor.replace(/\D/g, '');
    const cpfFormatado = cpfLimpo.replace(/(\d{3})(\d)/, '$1.$2')
                                  .replace(/(\d{3})(\d)/, '$1.$2')
                                  .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return cpfFormatado;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarCPF(e.target.value);
    setCpf(valorFormatado);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setCarregando(true);
    try {
      const response = await api.post('/transacoes', { 
        document: cpf.replace(/\D/g, ''), 
        valor: parseFloat(valor), 
        nome 
      });

      const data = response.data;
      toast.success(`Pontos registrados com sucesso! Pontos ganhos: ${data.pontosGanhos}`);
      setCpf('');
      setValor('');
      setNome('');
      setClienteInfo(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar transação');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Card className="h-full border-blue-100 shadow-sm flex flex-col">
      <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-4">
        <CardTitle className="text-xl flex items-center gap-2 text-blue-800">
          <PlusCircle className="h-5 w-5 text-blue-600" />
          Lançar Pontos
        </CardTitle>
        <CardDescription>
          Registre uma nova compra e credite pontos ao cliente
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit} className="flex flex-col flex-1">
        <CardContent className="space-y-4 pt-6 flex-1">
          <div className="space-y-2">
            <label htmlFor="cpf" className="text-sm font-medium leading-none text-slate-700">
              CPF do Cliente
            </label>
            <Input
              type="text"
              id="cpf"
              value={cpf}
              onChange={handleCpfChange}
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
                <div className={cn(
                  "flex items-center gap-2 text-sm p-2 rounded-md border",
                  clienteInfo.isNew ? "text-amber-700 bg-amber-50 border-amber-200" : "text-rose-700 bg-rose-50 border-rose-200"
                )}>
                  {clienteInfo.isNew ? <UserPlus className="h-4 w-4 shrink-0" /> : <Info className="h-4 w-4 shrink-0" />}
                  <span>{clienteInfo.error}</span>
                </div>
              )}
            </div>
          </div>

          {clienteInfo && clienteInfo.error && clienteInfo.isNew && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <label htmlFor="nome" className="text-sm font-medium leading-none text-slate-700">
                Nome do Novo Cliente
              </label>
              <Input
                type="text"
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite o nome completo"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="valor" className="text-sm font-medium leading-none text-slate-700">
              Valor da Compra (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 font-medium">R$</span>
              <Input
                type="number"
                id="valor"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
                className="pl-10 text-lg font-medium"
              />
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="pt-2 pb-6 px-6 mt-auto">
          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700" 
            disabled={carregando || (!clienteInfo && cpf.length === 14) || buscandoCliente}
          >
            {carregando ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processando...
              </>
            ) : (
              'Lançar Pontos'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default TransacaoForm;