// frontend/src/pages/LandingPage.js
import React from 'react';
import { Link } from 'react-router-dom';
import ConsultaSaldo from '../components/ConsultaSaldo';
import styles from './LandingPage.module.css';

function LandingPage() {
  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1>Bem-vindo ao Programa de Fidelidade!</h1>
        <p>Consulte seus pontos abaixo digitando seu CPF.</p>
      </header>

      <main className={styles.mainContent}>
        <ConsultaSaldo />
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