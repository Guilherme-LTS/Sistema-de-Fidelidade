// frontend/src/pages/HomePage.js
import React from 'react';
import styles from './HomePage.module.css';
import TransacaoForm from '../components/TransacaoForm';
import ConsultaSaldo from '../components/ConsultaSaldo';
import ResgateRecompensa from '../components/ResgateRecompensa';

function HomePage() {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentContainer}>
        <h1 className={styles.heading}>
          Sistema de Fidelidade
        </h1>
        <TransacaoForm />
        <hr className={styles.divider} />
        <ConsultaSaldo />
        <hr className={styles.divider} />
        <ResgateRecompensa />
      </div>
    </div>
  );
}

export default HomePage;