// frontend/src/components/ConsultaSaldo.js
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import styles from './ConsultaSaldo.module.css';

const formatarData = (dataISO) => {
  if (!dataISO) return '';
  const data = new Date(dataISO);
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

function ConsultaSaldo({ onConsulta }) {
  const [cpf, setCpf] = useState('');
  const [cliente, setCliente] = useState(null);
  const [carregando, setCarregando] = useState(false);
  
  // Novos estados para o extrato
  const [extrato, setExtrato] = useState([]);
  const [loadingExtrato, setLoadingExtrato] = useState(false);

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
    setExtrato([]); // Limpa o extrato anterior
    if (onConsulta) onConsulta(null);

    const cpfLimpo = cpf.replace(/\D/g, '');

    try {
      // Busca principal dos dados do cliente
      const resCliente = await fetch(`${process.env.REACT_APP_API_URL}/clientes/${cpfLimpo}`);
      const dataCliente = await resCliente.json();
      if (!resCliente.ok) throw new Error(dataCliente.error);
      
      setCliente(dataCliente);
      if (onConsulta) onConsulta(dataCliente.pontosDisponiveis);

      // Busca secundária do extrato
      setLoadingExtrato(true);
      const resExtrato = await fetch(`${process.env.REACT_APP_API_URL}/clientes/${cpfLimpo}/extrato`);
      const dataExtrato = await resExtrato.json();
      if (!resExtrato.ok) throw new Error(dataExtrato.error);
      setExtrato(dataExtrato);

    } catch (error) {
      setCliente(null);
      setExtrato([]);
      toast.error(error.message);
    } finally {
      setCarregando(false);
      setLoadingExtrato(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.heading}>Consulte seus Pontos</h2>
      <form onSubmit={handleConsulta}>
        {/* ... (seu formulário de consulta continua igual) ... */}
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
          {/* ... (seu display de pontos continua igual) ... */}
          <p className={styles.welcomeMessage}>Olá, {cliente.nome || 'Cliente'}!</p>
          <div className={styles.pointsDisplay}><span className={styles.pointsLabel}>Pontos Disponíveis</span><span className={styles.pointsValue}>{cliente.pontosDisponiveis}</span></div>
          {cliente.pontosPendentes > 0 && <p className={styles.infoMessage}>Você tem <strong>{cliente.pontosPendentes} pontos</strong> a serem liberados em breve.</p>}
          {cliente.proximoVencimento && <p className={styles.warningMessage}>Atenção: Parte dos seus pontos expira em <strong>{formatarData(cliente.proximoVencimento)}</strong>. Aproveite!</p>}

          {/* --- NOVA SEÇÃO DO EXTRATO --- */}
          <div className={styles.extratoContainer}>
            <h3 className={styles.extratoTitle}>Seu Extrato</h3>
            {loadingExtrato ? <p>Carregando extrato...</p> : (
              <table className={styles.extratoTable}>
                <tbody>
                  {extrato.map((item, index) => (
                    <tr key={index}>
                      <td>{formatarData(item.data)}</td>
                      <td>{item.descricao}</td>
                      <td className={item.tipo === 'credito' ? styles.credito : styles.debito}>
                        {item.tipo === 'credito' ? `+${item.pontos}` : `-${item.pontos}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ConsultaSaldo;
