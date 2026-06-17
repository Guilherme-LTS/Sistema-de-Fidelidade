import { CalendarClock, Info } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import styles from './ConsultaSaldo.module.css';

const formatarData = (dataISO) => {
  if (!dataISO) return '';
  const data = new Date(dataISO);
  return new Date(data.getTime() + data.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

function ConsultaSaldo({ onConsulta, onNotFound, tenantId, tenantSlug }) {
  const [cpf, setCpf] = useState('');
  const [cliente, setCliente] = useState(null);
  const [carregando, setCarregando] = useState(false);

  const formatarCPF = (valor) => {
    return valor.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleCpfChange = (e) => {
    setCpf(formatarCPF(e.target.value));
  };

  const handleConsulta = async (event) => {
    event.preventDefault();
    setCarregando(true);
    setCliente(null);
    if (onConsulta) onConsulta(null);

    const cpfLimpo = cpf.replace(/\D/g, '');
    const publicTenantId = tenantId || process.env.REACT_APP_PUBLIC_TENANT_ID;

    try {
      let endpoint = `${process.env.REACT_APP_API_URL}/public/pontos/${cpfLimpo}`;
      const queryParams = new URLSearchParams();
      if (publicTenantId) {
        queryParams.set('tenant_id', publicTenantId);
      } else if (tenantSlug) {
        queryParams.set('tenant_slug', tenantSlug);
      }
      const query = queryParams.toString();
      if (query) endpoint = `${endpoint}?${query}`;

      const response = await fetch(endpoint);
      
      if (response.status === 404) {
        if (onNotFound) {
          onNotFound();
        }
        setCarregando(false);
        return; 
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }

      const saldo = Array.isArray(data.saldos) && data.saldos.length > 0 ? data.saldos[0] : null;
      if (!saldo) {
        throw new Error('Nenhum saldo encontrado para este documento.');
      }

      const clienteNormalizado = {
        nome: saldo.customer_name,
        pontosDisponiveis: saldo.pontos_disponiveis || 0,
        pontosPendentes: saldo.pontos_pendentes || 0,
        dataProximaLiberacao: saldo.data_proxima_liberacao || null,
        pontosExpirando: saldo.pontos_expirando || 0,
        dataProximaExpiracao: saldo.data_proxima_expiracao || null,
      };

      setCliente(clienteNormalizado);
      if (onConsulta) {
        onConsulta(clienteNormalizado.pontosDisponiveis);
      }
    } catch (error) {
      setCliente(null);
      toast.error(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.heading}>Consulte seus Pontos</h2>
      <form onSubmit={handleConsulta}>
        <div className={styles.formGroup}>
          <label htmlFor="cpf-consulta" className={styles.label}>Digite seu CPF</label>
          <input type="text" id="cpf-consulta" className={styles.input} value={cpf} onChange={handleCpfChange} placeholder="000.000.000-00" maxLength="14" required />
        </div>
        <button type="submit" className={styles.button} disabled={carregando}>
          {carregando ? 'Consultando...' : 'Consultar'}
        </button>
      </form>

      {cliente && (
        <div className={styles.resultadoContainer}>
          <p className={styles.welcomeMessage}>Olá, {cliente.nome || 'Cliente'}!</p>
          <div className={styles.pointsDisplay}>
            <span className={styles.pointsLabel}>Pontos Disponíveis</span>
            <span className={styles.pointsValue}>{cliente.pontosDisponiveis}</span>
          </div>

          {cliente.pontosPendentes > 0 && (
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-start gap-3 mt-4 text-left">
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
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-start gap-3 mt-4 text-left">
              <CalendarClock className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="text-sm text-emerald-900 font-bold">
                  Atenção: {cliente.pontosExpirando} pontos expiram em breve!
                </p>
                {cliente.dataProximaExpiracao && (
                  <p className="text-xs text-emerald-800 mt-1">
                    Data mais urgente: {formatarData(cliente.dataProximaExpiracao)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ConsultaSaldo;