import React, { useState } from 'react';
import { toast } from 'react-toastify';
import styles from './ConsultaSaldo.module.css';

// 1. A função formatarData foi movida para fora para melhor organização
const formatarData = (dataISO) => {
  if (!dataISO) return '';
  const data = new Date(dataISO);
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// 2. Aceitamos a nova propriedade 'onNotFound'
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
      
      // 3. Verificamos especificamente se o cliente não foi encontrado (status 404)
      if (response.status === 404) {
        // Se for 404, chamamos a função onNotFound que veio da LandingPage
        if (onNotFound) {
          onNotFound();
        }
        setCarregando(false);
        return; // Interrompemos a execução para não dar erro de JSON
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

  // O JSX do componente permanece o mesmo
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
          {cliente.pontosPendentes > 0 && <p className={styles.infoMessage}>Você tem <strong>{cliente.pontosPendentes} pontos</strong> a serem liberados em breve.</p>}
          {cliente.proximoVencimento && <p className={styles.warningMessage}>Atenção: Parte dos seus pontos expira em <strong>{formatarData(cliente.proximoVencimento)}</strong>. Aproveite!</p>}
        </div>
      )}
    </div>
  );
}

export default ConsultaSaldo;

