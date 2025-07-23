// frontend/src/components/TransacaoForm.js
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import styles from './TransacaoForm.css';

function TransacaoForm() {
  const [cpf, setCpf] = useState('');
  const [valor, setValor] = useState('');
  const [carregando, setCarregando] = useState(false);

  const formatarCPF = (valor) => {
    return valor.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setCarregando(true);
    try {
      // ... (sua lógica de fetch continua a mesma) ...
      const response = await fetch(`${process.env.REACT_APP_API_URL}/transacoes`, { /* ... */ });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(`Pontos registrados! Pontos ganhos: ${data.pontosGanhos}`);
      setCpf('');
      setValor('');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCarregando(false);
    }
  };

  // 2. Usamos HTML padrão com `className` apontando para nossos estilos
  return (
    <form onSubmit={handleSubmit} className={styles.formBox}>
      <h2 className={styles.heading}>Lançar Pontos</h2>
      <div className={styles.stack}>
        <div className={styles.formGroup}>
          <label htmlFor="cpf-transacao" className={styles.label}>CPF do Cliente</label>
          <input
            id="cpf-transacao"
            type="text"
            className={styles.input}
            value={cpf}
            onChange={(e) => setCpf(formatarCPF(e.target.value))}
            placeholder="000.000.000-00"
            maxLength="14"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="valor-transacao" className={styles.label}>Valor da Compra (R$)</label>
          <input
            id="valor-transacao"
            type="number"
            className={styles.input}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Ex: 150.75"
            required
          />
        </div>

        <button
          type="submit"
          className={styles.button}
          disabled={carregando}
        >
          {carregando ? 'Lançando...' : 'Lançar Pontos'}
        </button>
      </div>
    </form>
  );
}

export default TransacaoForm;