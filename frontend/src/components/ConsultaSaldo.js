import { CalendarClock, Info } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import styles from './ConsultaSaldo.module.css';

const formatarData = (dataISO) => {
  if (!dataISO) return '';
  const data = new Date(dataISO);
  return new Date(data.getTime() + data.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

function ConsultaSaldo({ onConsulta, onNotFound }) {
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

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/clientes/${cpfLimpo}`);
      
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

      setCliente(data);
      if (onConsulta) {
        onConsulta(data.pontosDisponiveis);
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
            <div className="bg-rose-50 border border-rose-300 p-3 rounded-lg flex items-start gap-3 mt-4 text-left">
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
    </div>
  );
}

export default ConsultaSaldo;