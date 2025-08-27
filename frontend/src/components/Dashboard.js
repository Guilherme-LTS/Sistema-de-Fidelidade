// frontend/src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import styles from './Dashboard.module.css';
import Spinner from './Spinner';

// Registra os componentes do Chart.js que vamos usar
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      // 1. Pega o token do localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Você não está autenticado.');
        setLoading(false);
        return;
      }

      try {
        // 2. Faz a requisição para a rota protegida, incluindo o token no cabeçalho
        const response = await fetch(`${process.env.REACT_APP_API_URL}/dashboard/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Falha ao buscar os dados do dashboard.');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Configuração do gráfico de barras
  const chartData = {
    labels: stats?.recompensasPopulares.map(r => r.nome) || [],
    datasets: [
      {
        label: 'Total de Resgates',
        data: stats?.recompensasPopulares.map(r => r.total_resgates) || [],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  if (loading) {
    return (
      <div className={styles.Container}>
        <div className={styles.spinnerContainer}>
          <Spinner />
        </div>
      </div>
    );
  }  

  if (error) return <p className={styles.error}>{error}</p>;
  if (!stats) return null;

  return (
    <div className={styles.dashboardContainer}>
      <h2 className={styles.dashboardTitle}>Dashboard Analítico</h2>

      {/* Seção de Métricas Gerais */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Total de Clientes</h3>
          <p className={styles.cardValue}>{stats.metricas.total_clientes}</p>
        </div>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Total de Pontos Distribuídos</h3>
          <p className={styles.cardValue}>{stats.metricas.total_pontos_distribuidos || 0}</p>
        </div>
      </div>

      {/* Seção de Top Clientes e Recompensas */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Top 5 Clientes</h3>
          <ul className={styles.list}>
            {stats.topClientes.map((cliente, index) => (
              <li key={index} className={styles.listItem}>
                <span>{cliente.nome || `CPF: ...${cliente.cpf.slice(-4)}`}</span>
                <span className={styles.points}>{cliente.pontos_disponiveis} pts</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Recompensas Mais Populares</h3>
          <Bar data={chartData} options={{ responsive: true }} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;