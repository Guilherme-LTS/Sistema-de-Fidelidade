import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ConsultaSaldo from '../components/ConsultaSaldo';
import styles from './LandingPage.module.css';

function LandingPage() {
  // Novo estado para controlar a visão atual: 'escolha' (padrão), ou 'consulta'
  const [view, setView] = useState('escolha');
  const navigate = useNavigate();

  // Esta função será chamada pelo ConsultaSaldo quando um CPF não for encontrado
  const handleClienteNaoEncontrado = () => {
    toast.info("CPF não encontrado. Por favor, faça seu cadastro para começar!");
    // Forçamos o redirecionamento para a página de cadastro
    navigate('/cadastro');
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1>Bem-vindo ao Programa de Fidelidade!</h1>
        <p>Participe do nosso programa de pontos e troque por prêmios incríveis.</p>
      </header>
      
      <main className={styles.mainContent}>
        {/* Renderização Condicional com base na escolha do usuário */}

        {view === 'escolha' && (
          <div className={styles.escolhaContainer}>
            <Link to="/cadastro" className={styles.cadastroButton}>
              Quero Fazer Meu Cadastro
            </Link>
            <button onClick={() => setView('consulta')} className={styles.consultaButton}>
              Já Tenho Cadastro
            </button>
          </div>
        )}

        {view === 'consulta' && (
          <div className={styles.consultaSection}>
            {/* Passamos a nova função 'onNotFound' como propriedade.
                O componente ConsultaSaldo precisará de um pequeno ajuste para usá-la. */}
            <ConsultaSaldo onNotFound={handleClienteNaoEncontrado} />
            <button onClick={() => setView('escolha')} className={styles.backLink}>
              &larr; Voltar
            </button>
          </div>
        )}

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

