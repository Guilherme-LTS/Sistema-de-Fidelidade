// frontend/src/components/ConsultaSaldo.js
import React, { useState } from 'react';
import { toast } from 'react-toastify';
// 1. Importe o CSS Module
import styles from './ConsultaSaldo.module.css';

function ConsultaSaldo() {
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

    const cpfLimpo = cpf.replace(/\D/g, '');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/clientes/${cpfLimpo}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setCliente(data);
      toast.success("Cliente encontrado!");

    } catch (error) {
      setCliente(null);
      toast.error(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    // 2. Aplicamos as novas classes de estilo
    <div className={styles.formContainer}>
      <h2 className={styles.heading}>Consultar Saldo de Pontos</h2>
      <form onSubmit={handleConsulta}>
        <div className={styles.formGroup}>
          <label htmlFor="cpf-consulta" className={styles.label}>CPF do Cliente</label>
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
          <h3 className={styles.resultadoHeading}>Dados do Cliente</h3>
          <p className={styles.resultadoParagrafo}><strong>CPF:</strong> {formatarCPF(cliente.cpf)}</p>
          <p className={styles.resultadoParagrafo}><strong>Pontos:</strong> {cliente.pontos_totais}</p>
        </div>
      )}
    </div>
  );
}

export default ConsultaSaldo;