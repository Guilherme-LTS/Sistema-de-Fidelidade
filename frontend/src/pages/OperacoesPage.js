// frontend/src/pages/OperacoesPage.js
import React from 'react';
import styles from './HomePage.module.css'; // Podemos reutilizar este estilo
import TransacaoForm from '../components/TransacaoForm';
import ConsultaSaldo from '../components/ConsultaSaldo';
import ResgateRecompensa from '../components/ResgateRecompensa';

function OperacoesPage() {
  return (
    <div>
      <h1 className={styles.heading}>Operações do Caixa</h1>
      <div className={styles.operacoesGrid}>
        <TransacaoForm />
        <ConsultaSaldo />
        <ResgateRecompensa />
      </div>
    </div>
  );
}

export default OperacoesPage;