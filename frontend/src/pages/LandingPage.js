// frontend/src/pages/LandingPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ConsultaSaldo from '../components/ConsultaSaldo';
import styles from './LandingPage.module.css';

function LandingPage() {
  // 1. Novos estados para as recompensas
  const [recompensas, setRecompensas] = useState([]);
  const [loadingRecompensas, setLoadingRecompensas] = useState(true);

  // 2. Efeito para buscar as recompensas quando a página carrega
  useEffect(() => {
    const fetchRecompensas = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/recompensas/publica`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error('Não foi possível carregar as recompensas.');
        }
        setRecompensas(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingRecompensas(false);
      }
    };
    fetchRecompensas();
  }, []);


  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1>Bem-vindo ao Programa de Fidelidade!</h1>
        <p>Consulte seus pontos e veja os prêmios que você pode resgatar.</p>
      </header>

      <main className={styles.mainContent}>
        <ConsultaSaldo />

        {/* 3. Nova seção para exibir as recompensas */}
        <div className={styles.recompensasSection}>
          <h2>Nossos Prêmios</h2>
          {loadingRecompensas ? (
            <p>Carregando prêmios...</p>
          ) : (
            <ul className={styles.recompensasList}>
              {recompensas.map((rec, index) => (
                <li key={index} className={styles.recompensaItem}>
                  <span className={styles.recompensaNome}>{rec.nome}</span>
                  <span className={styles.recompensaPontos}>{rec.custo_pontos} pts</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <footer className={styles.footer}>
        <Link to="/login" className={styles.adminLink}>
          Acesso do Operador
        </Link>
      </footer>
    </div>
  );
}

export default LandingPage;