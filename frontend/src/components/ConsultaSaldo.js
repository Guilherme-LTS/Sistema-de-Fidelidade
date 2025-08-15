// frontend/src/components/ConsultaSaldo.js
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import styles from './ConsultaSaldo.module.css';

// 1. Aceitamos a nova propriedade 'onConsulta'
function ConsultaSaldo({ onConsulta }) {
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
    if (onConsulta) onConsulta(null); // Limpa o saldo no componente pai

    const cpfLimpo = cpf.replace(/\D/g, '');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/clientes/${cpfLimpo}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }
      setCliente(data);
      // 2. Se a consulta deu certo, chamamos a função e passamos o saldo de pontos
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
    // O JSX (visual) do componente continua exatamente o mesmo
    <div className={styles.formContainer}>
      <h2 className={styles.heading}>Consulte seus Pontos</h2>
      <form onSubmit={handleConsulta}>
        <div className={styles.formGroup}>
          <label htmlFor="cpf-consulta" className={styles.label}>Digite seu CPF</label>
          <input
            type="text"
            id="cpf-consulta"
            className={styles.input}
            value={cpf}
            onChange={handleCpfChange}
            placeholder="000.000.000-00"
            maxLength="14"
            required
          />
        </div>
        <button type="submit" className={styles.button} disabled={carregando}>
          {carregando ? 'Consultando...' : 'Consultar'}
        </button>
      </form>

      {cliente && (
        <div className={styles.resultadoContainer}>
          <p className={styles.welcomeMessage}>
            Olá, {cliente.nome || 'Cliente'}!
          </p>
          <div className={styles.pointsDisplay}>
            <span className={styles.pointsLabel}>Pontos Disponíveis</span>
            <span className={styles.pointsValue}>{cliente.pontosDisponiveis}</span>
          </div>
          {cliente.pontosPendentes > 0 && (
            <p className={styles.infoMessage}>
              Você tem <strong>{cliente.pontosPendentes} pontos</strong> a serem liberados em breve.
            </p>
          )}
          {cliente.proximoVencimento && (
            <p className={styles.warningMessage}>
              Atenção: Parte dos seus pontos expira em <strong>{formatarData(cliente.proximoVencimento)}</strong>. Aproveite!
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Pequena função para formatar a data (movida para fora para clareza)
const formatarData = (dataISO) => {
  if (!dataISO) return '';
  const data = new Date(dataISO);
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export default ConsultaSaldo;