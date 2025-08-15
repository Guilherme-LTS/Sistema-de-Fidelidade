// frontend/src/pages/LandingPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ConsultaSaldo from '../components/ConsultaSaldo';
import styles from './LandingPage.module.css';

function LandingPage() {
  const [recompensas, setRecompensas] = useState([]);
  const [loadingRecompensas, setLoadingRecompensas] = useState(true);
  const [saldoCliente, setSaldoCliente] = useState(null);

  useEffect(() => {
    const fetchRecompensas = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/recompensas/publica`);
        const data = await response.json();
        if (!response.ok) throw new Error('Não foi possível carregar as recompensas.');
        setRecompensas(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingRecompensas(false);
      }
    };
    fetchRecompensas();
  }, []);

  // 2. Função que será passada para o ConsultaSaldo
  const handleConsulta = (saldo) => {
    setSaldoCliente(saldo);
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1>Bem-vindo ao Programa de Fidelidade!</h1>
        <p>Consulte seus pontos e veja os prêmios que você pode resgatar.</p>
      </header>
      
      <main className={styles.mainContent}>
        {/* 3. Passamos a função como uma propriedade */}
        <ConsultaSaldo onConsulta={handleConsulta} />

        <div className={styles.recompensasSection}>
          <h2>Nossos Prêmios</h2>
          {loadingRecompensas ? (
            <p>Carregando prêmios...</p>
          ) : (
            <ul className={styles.recompensasList}>
              {recompensas.map((rec, index) => {
                // 4. Verificamos se o cliente pode resgatar este prêmio
                const podeResgatar = saldoCliente !== null && saldoCliente >= rec.custo_pontos;
                const itemClass = `${styles.recompensaItem} ${podeResgatar ? styles.resgatavel : ''}`;

                return (
                  <li key={index} className={itemClass}>
                    <span className={styles.recompensaNome}>{rec.nome}</span>
                    <span className={styles.recompensaPontos}>{rec.custo_pontos} pts</span>
                  </li>
                );
              })}
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