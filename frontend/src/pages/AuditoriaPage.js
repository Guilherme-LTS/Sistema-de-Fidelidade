// frontend/src/pages/AuditoriaPage.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import styles from './AuditoriaPage.module.css';
import Spinner from '../components/Spinner';

const formatarData = (dataISO) => {
  if (!dataISO) return '';
  const data = new Date(dataISO);
  return data.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

function AuditoriaPage() {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLog = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/auditoria`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Falha ao buscar log.');
        setLog(data);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLog();
  }, []);

  if (loading) {
    return (
      <div className={styles.Container}>
        <div className={styles.spinnerContainer}>
          <Spinner />
        </div>
      </div>
    );
  }
  return (
    <div className={styles.container}>
      <h1>Log de Atividades</h1>
      <p>Acompanhe todos os lançamentos e resgates realizados no sistema.</p>
      
      <div className={styles.tableContainer}>
        <table className={styles.logTable}>
          <thead>
            <tr>
              <th>Data e Hora</th>
              <th>Operador</th>
              <th>Cliente</th>
              <th>Ação</th>
              <th>Pontos</th>
            </tr>
          </thead>
          <tbody>
            {log.map((item, index) => (
              <tr key={index}>
                <td>{formatarData(item.data)}</td>
                <td>{item.nome_operador}</td>
                <td>{item.nome_cliente || 'N/A'}</td>
                <td>{item.acao}</td>
                <td className={item.pontos > 0 ? styles.credito : styles.debito}>
                  {item.pontos > 0 ? `+${item.pontos}` : item.pontos}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AuditoriaPage;
