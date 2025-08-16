// frontend/src/pages/ClientesPage.js
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import styles from './ClientesPage.module.css';

const formatarData = (dataISO) => {
  if (!dataISO) return '';
  const data = new Date(dataISO);
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

function ClientesPage() {
  const [cpf, setCpf] = useState('');
  const [cliente, setCliente] = useState(null);
  const [extrato, setExtrato] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const formatarCPF = (valor) => {
    return valor.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleConsulta = async (event) => {
    event.preventDefault();
    setCarregando(true);
    setCliente(null);
    setExtrato([]);
    const cpfLimpo = cpf.replace(/\D/g, '');
    const token = localStorage.getItem('token');

    try {
      // Usamos Promise.all para fazer as duas buscas em paralelo
      const [resCliente, resExtrato] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/clientes/${cpfLimpo}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${process.env.REACT_APP_API_URL}/clientes/${cpfLimpo}/extrato`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const dataCliente = await resCliente.json();
      if (!resCliente.ok) throw new Error(dataCliente.error);
      setCliente(dataCliente);

      const dataExtrato = await resExtrato.json();
      if (!resExtrato.ok) throw new Error(dataExtrato.error);
      setExtrato(dataExtrato);

    } catch (error) {
      toast.error(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Consulta de Clientes</h1>
      <form onSubmit={handleConsulta} className={styles.searchForm}>
        <input
          type="text"
          value={cpf}
          onChange={(e) => setCpf(formatarCPF(e.target.value))}
          placeholder="Digite o CPF do cliente para consultar"
          maxLength="14"
          required
        />
        <button type="submit" disabled={carregando}>
          {carregando ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {cliente && (
        <div className={styles.resultsContainer}>
          <h2>Resultados para: {cliente.nome || `CPF ${formatarCPF(cliente.cpf)}`}</h2>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <h4>Pontos Disponíveis</h4>
              <p>{cliente.pontosDisponiveis}</p>
            </div>
            <div className={styles.summaryCard}>
              <h4>Pontos Pendentes</h4>
              <p>{cliente.pontosPendentes}</p>
            </div>
          </div>

          <h3>Extrato Completo</h3>
          <table className={styles.extratoTable}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Pontos</th>
              </tr>
            </thead>
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
        </div>
      )}
    </div>
  );
}

export default ClientesPage;
