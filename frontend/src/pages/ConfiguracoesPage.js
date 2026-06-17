import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../services/api';
import styles from './ConfiguracoesPage.module.css';

const ConfiguracoesPage = () => {
  const [expiracao, setExpiracao] = useState({ valor: 6, unidade: 'meses' });
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    // Buscar configurações atuais
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/configuracoes/expiracao`);
        if (res.ok) {
          const data = await res.json();
          setExpiracao({ valor: data.valor, unidade: data.unidade });
        }
      } catch (err) {
        console.error('Erro ao buscar configuração:', err);
      }
    };
    fetchConfig();
  }, []);
  
  const handleSave = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/configuracoes/expiracao`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(expiracao)
      });
      if (res.ok) {
        setFeedback({ type: 'success', msg: 'Regras atualizadas com sucesso.' });
      } else {
        const errorData = await res.json();
        setFeedback({ type: 'error', msg: errorData.error || 'Erro ao salvar.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: 'Erro de conexão.' });
    } finally {
      setSalvando(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Configurações do Sistema</h1>
        <p className={styles.subtitle}>Gerencie as regras de negócio e parâmetros gerais.</p>
      </header>

      <div className={styles.card}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.iconContainer}>
              <i className="ph ph-hourglass-high"></i>
            </div>
            <div>
              <h2 className={styles.sectionTitle}>Regras de Expiração</h2>
              <p className={styles.sectionDescription}>
                Defina o tempo limite para que os pontos dos clientes percam a validade após serem adquiridos.
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className={styles.formGroup}>
            <div className={styles.inputRow}>
              <div className={styles.inputWrapper}>
                <label className={styles.label}>Tempo (Valor Numérico)</label>
                <input 
                  type="number" 
                  min="1"
                  value={expiracao.valor}
                  onChange={(e) => setExpiracao({...expiracao, valor: parseInt(e.target.value)})}
                  className={styles.input} 
                />
              </div>
              <div className={styles.inputWrapper}>
                <label className={styles.label}>Unidade de Tempo</label>
                <select 
                  value={expiracao.unidade}
                  onChange={(e) => setExpiracao({...expiracao, unidade: e.target.value})}
                  className={styles.select}
                >
                  <option value="dias">Dias</option>
                  <option value="meses">Meses</option>
                  <option value="anos">Anos</option>
                </select>
              </div>
            </div>

            <div className={styles.actionRow}>
              {feedback && (
                <span className={feedback.type === 'error' ? styles.errorMessage : styles.successMessage}>
                  {feedback.msg}
                </span>
              )}
              <button type="submit" className={styles.buttonPrimary} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar Configuração'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default ConfiguracoesPage;