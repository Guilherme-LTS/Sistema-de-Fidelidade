// frontend/src/components/TransacaoForm.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import styles from './TransacaoForm.module.css';
import useDebounce from '../hooks/useDebounce'; // 1. Importe nosso hook

function TransacaoForm() {
  const [cpf, setCpf] = useState('');
  const [valor, setValor] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Novos estados para o feedback instantâneo
  const [clienteInfo, setClienteInfo] = useState(null);
  const [buscandoCliente, setBuscandoCliente] = useState(false);

  // 2. Use o hook para "atrasar" o valor do CPF
  const debouncedCpf = useDebounce(cpf, 500); // 500ms de atraso

  // 3. Efeito que roda sempre que o CPF "atrasado" muda
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
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL}/clientes/${cpfLimpo}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        const data = await response.json();
        if (response.ok) {
          setClienteInfo(data);
        } else {
          setClienteInfo({ error: data.error || 'Cliente não encontrado.' });
        }
      } catch (error) {
        setClienteInfo({ error: 'Erro de conexão.' });
      } finally {
        setBuscandoCliente(false);
      }
    };

    if (debouncedCpf) {
      buscarCliente();
    }
  }, [debouncedCpf]);


  const formatarCPF = (valor) => {
    // ... (sua função continua igual)
    return valor.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleCpfChange = (e) => {
    setCpf(formatarCPF(e.target.value));
  };

  const handleSubmit = async (event) => {
    // ... (sua função de submit continua igual)
    event.preventDefault();
    setCarregando(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/transacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ cpf: cpf.replace(/\D/g, ''), valor: parseFloat(valor) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ocorreu um erro.');
      toast.success(`Pontos registrados! Pontos ganhos: ${data.pontosGanhos}`);
      setCpf('');
      setValor('');
      setClienteInfo(null);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.formContainer}>
      <h2 className={styles.heading}>Lançar Pontos</h2>
      <div className={styles.stack}>
        <div className={styles.formGroup}>
          <label htmlFor="cpf" className={styles.label}>CPF do Cliente</label>
          <input
            type="text"
            id="cpf"
            className={styles.input}
            value={cpf}
            onChange={handleCpfChange}
            placeholder="000.000.000-00"
            maxLength="14"
            required
          />
          {/* 4. Área para exibir o feedback */}
          <div className={styles.feedbackArea}>
            {buscandoCliente && <p>Buscando cliente...</p>}
            {clienteInfo && !clienteInfo.error && (
              <p className={styles.clienteInfo}>
                Cliente: <strong>{clienteInfo.nome || 'Não cadastrado'}</strong> | Saldo: <strong>{clienteInfo.pontos_totais} pts</strong>
              </p>
            )}
            {clienteInfo && clienteInfo.error && (
              <p className={styles.clienteErro}>{clienteInfo.error}</p>
            )}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="valor" className={styles.label}>Valor da Compra (R$)</label>
          <input
            type="number"
            id="valor"
            className={styles.input}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Ex: 150.75"
            required
          />
        </div>

        <button type="submit" className={styles.button} disabled={carregando}>
          {carregando ? 'Processando...' : 'Lançar Pontos'}
        </button>
      </div>
    </form>
  );
}

export default TransacaoForm;