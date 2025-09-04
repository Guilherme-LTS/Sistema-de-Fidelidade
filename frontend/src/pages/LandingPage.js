import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ConsultaSaldo from '../components/ConsultaSaldo';
import styles from './LandingPage.module.css';

function LandingPage() {
  const [view, setView] = useState('escolha');
  const navigate = useNavigate();

  // Estados para a lista de recompensas e o saldo do cliente
  const [recompensas, setRecompensas] = useState([]);
  const [loadingRecompensas, setLoadingRecompensas] = useState(true);
  const [saldoCliente, setSaldoCliente] = useState(null);

  // Efeito para buscar as recompensas uma vez, quando a página carrega
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

  const handleClienteNaoEncontrado = () => {
    toast.info("CPF não encontrado. Por favor, faça seu cadastro para começar!");
    navigate('/cadastro');
  };

  // Função para receber o saldo do componente ConsultaSaldo
  const handleConsulta = (saldo) => {
    setSaldoCliente(saldo);
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1>Bem-vindo ao Programa de Fidelidade!</h1>
        <p>Participe do nosso programa de pontos e troque por prêmios incríveis.</p>
      </header>
      
      <main className={styles.mainContent}>
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
            <ConsultaSaldo onNotFound={handleClienteNaoEncontrado} onConsulta={handleConsulta} />
            
            {/* Seção de recompensas, agora dentro da visão de consulta */}
            <div className={styles.recompensasSection}>
              <h2>Nossos Prêmios</h2>
              {loadingRecompensas ? (
                <p>Carregando prêmios...</p>
              ) : (
                <ul className={styles.recompensasList}>
                  {recompensas.map((rec, index) => {
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

