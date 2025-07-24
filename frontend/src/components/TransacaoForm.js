// frontend/src/components/TransacaoForm.js
import React, { useState } from 'react';
import { toast } from 'react-toastify';
// 1. Importamos o CSS Module
import styles from './TransacaoForm.module.css';

function TransacaoForm() {
  const [cpf, setCpf] = useState('');
  const [valor, setValor] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Sua função de formatar CPF (mantida 100% intacta)
  const formatarCPF = (valor) => {
    const cpfLimpo = valor.replace(/\D/g, '');
    const cpfFormatado = cpfLimpo.replace(/(\d{3})(\d)/, '$1.$2')
                                  .replace(/(\d{3})(\d)/, '$1.$2')
                                  .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return cpfFormatado;
  };

  // Sua função de lidar com a mudança no CPF (mantida 100% intacta)
  const handleCpfChange = (e) => {
    const valorFormatado = formatarCPF(e.target.value);
    setCpf(valorFormatado);
  };

  // Sua função de envio (mantida 100% intacta)
  const handleSubmit = async (event) => {
    event.preventDefault();
    setCarregando(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/transacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cpf.replace(/\D/g, ''), valor: parseFloat(valor) }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ocorreu um erro na requisição.');
      }

      toast.success(`Pontos registrados com sucesso! Pontos ganhos: ${data.pontosGanhos}`);
      setCpf('');
      setValor('');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    // 2. A única mudança real é aqui, nos nomes das classes
    <form onSubmit={handleSubmit} className={styles.formContainer}>
      <h2 className={styles.heading}>
        Lançar Pontos
      </h2>
      <div className={styles.stack}>
        <div className={styles.formGroup}>
          <label htmlFor="cpf" className={styles.label}>CPF do Cliente</label>
          <input
            type="text"
            id="cpf"
            className={styles.input}
            value={cpf}
            onChange={handleCpfChange} // Usando sua função
            placeholder="000.000.000-00"
            maxLength="14"
            required
          />
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
            step="0.01"
            min="0"
            required
          />
        </div>

        <button
          type="submit"
          className={styles.button}
          disabled={carregando}
        >
          {carregando ? 'Processando...' : 'Lançar Pontos'}
        </button>
      </div>
    </form>
  );
}

export default TransacaoForm;