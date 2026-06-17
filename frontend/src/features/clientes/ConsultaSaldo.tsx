import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { consultarClientePorCpf } from './clientes.api';
import { getErrorMessage } from '../../shared/utils/errors';
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
import { Search, Loader2, CalendarClock, Info, ShieldCheck } from 'lucide-react';

const formatarData = (dataISO: string) => {
  if (!dataISO) return '';
  const data = new Date(dataISO);
  return new Date(data.getTime() + data.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const CUSTOMER_NOT_FOUND_MESSAGE = 'Cliente não encontrado. Cadastre o cliente antes de lançar pontos.';

interface ConsultaSaldoProps {
  onConsulta?: (saldo: number | null) => void;
  onNotFound?: () => void;
}

function ConsultaSaldo({ onConsulta, onNotFound }: ConsultaSaldoProps) {
  const [cpf, setCpf] = useState('');
  const [cliente, setCliente] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);

  const formatarCPF = (valor: string) => {
    return valor.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatarCPF(e.target.value));
  };

  const handleConsulta = async (event: React.FormEvent) => {
    event.preventDefault();
    setCarregando(true);
    setCliente(null);
    if (onConsulta) onConsulta(null);

    const cpfLimpo = cpf.replace(/\D/g, '');

    try {
      const data = await consultarClientePorCpf(cpfLimpo);
      setCliente(data);
      if (onConsulta) {
        onConsulta(data.pontosDisponiveis);
      }
    } catch (error: any) {
      setCliente(null);
      if (error.response?.status === 404) {
        if (onNotFound) {
          onNotFound();
        } else {
          toast.error(CUSTOMER_NOT_FOUND_MESSAGE);
        }
      } else {
        toast.error(getErrorMessage(error));
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Card className="h-full border-green-100 shadow-sm flex flex-col">
      <CardHeader className="bg-green-50/50 border-b border-green-100 pb-4">
        <CardTitle className="text-xl flex items-center gap-2 text-green-800">
          <Search className="h-5 w-5 text-green-600" />
          Consulta de Saldo
        </CardTitle>
        <CardDescription>
          Verifique o saldo disponível e pontos pendentes
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleConsulta} className="flex flex-col flex-1">
        <CardContent className="space-y-4 pt-6 flex-1">
          <div className="space-y-2">
            <label htmlFor="cpf-consulta" className="text-sm font-medium leading-none text-slate-700">
              Digite o CPF do Cliente
            </label>
            <Input
              type="text"
              id="cpf-consulta"
              value={cpf}
              onChange={handleCpfChange}
              placeholder="000.000.000-00"
              maxLength={14}
              required
              className="text-lg font-medium tracking-wider"
            />
          </div>

          {cliente && (
            <div className="mt-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <p className="text-green-900 font-medium flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    {cliente.nome || 'Cliente'}
                  </p>
                  <p className="text-sm text-green-800 mt-1">Pontos Disponíveis</p>
                </div>
                <span className="text-4xl font-bold text-green-600 tracking-tight">
                  {cliente.pontosDisponiveis || 0}
                </span>
              </div>

              {cliente.pontosPendentes > 0 && (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-start gap-3">
                  <Info className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-800 font-medium">
                      {cliente.pontosPendentes} pontos pendentes
                    </p>
                    {cliente.dataProximaLiberacao && (
                      <p className="text-xs text-slate-600 mt-1">
                        Próxima liberação em: {formatarData(cliente.dataProximaLiberacao)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {cliente.pontosExpirando > 0 && (
                <div className="bg-rose-50 border border-rose-300 p-3 rounded-lg flex items-start gap-3">
                  <CalendarClock className="h-5 w-5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <p className="text-sm text-rose-900 font-bold">
                      Atenção: {cliente.pontosExpirando} pontos expiram em breve!
                    </p>
                    {cliente.dataProximaExpiracao && (
                      <p className="text-xs text-rose-800 mt-1">
                        Data mais urgente: {formatarData(cliente.dataProximaExpiracao)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-2 pb-6 px-6 mt-auto">
          <Button
            type="submit"
            variant="secondary"
            className="w-full h-12 text-base font-semibold border-slate-200"
            disabled={carregando || cpf.length < 14}
          >
            {carregando ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Consultando...
              </>
            ) : (
              'Consultar Saldo'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default ConsultaSaldo;
