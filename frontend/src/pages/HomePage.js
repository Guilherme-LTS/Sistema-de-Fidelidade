// frontend/src/pages/HomePage.js
import React from 'react';
import styles from './HomePage.module.css';
import TransacaoForm from '../components/TransacaoForm';
import ConsultaSaldo from '../components/ConsultaSaldo';
import ResgateRecompensa from '../components/ResgateRecompensa';
import Dashboard from '../components/Dashboard'; // 1. Importe o Dashboard

function HomePage() {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentContainer}>
        <h1 className={styles.heading}>
          Sistema de Fidelidade
        </h1>

        <Dashboard />
        <hr className={styles.divider} />

        <div className={styles.operacoesGrid}>
          <TransacaoForm />
          <ConsultaSaldo />
          <ResgateRecompensa />
        </div>
      </div>
    </div>
  );
}

export default HomePage;