// frontend/src/pages/CadastroPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './CadastroPage.module.css';

function CadastroPage() {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [consentimento, setConsentimento] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  const formatarCPF = (valor) => {
    return valor.replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleCpfChange = (e) => {
    const valorFormatado = formatarCPF(e.target.value);
    if (valorFormatado.length <= 14) {
      setCpf(valorFormatado);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!consentimento) {
      toast.warn('Você precisa aceitar os termos para continuar.');
      return;
    }
    setCarregando(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/clientes/cadastro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          cpf,
          lgpd_consentimento: consentimento,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao realizar o cadastro.');
      }
      toast.success('Cadastro realizado com sucesso! Agora você já pode consultar seus pontos na página inicial.');
      navigate('/'); // Redireciona para a página inicial
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.formContainer}>
        <h1 className={styles.heading}>
          Faça parte do nosso Clube!
        </h1>
        <p className={styles.subheading}>
          Cadastre-se para começar a juntar pontos e resgatar prêmios.
        </p>
        <form onSubmit={handleSubmit}>
          <div className={styles.stack}>
            <div className={styles.formGroup}>
              <label htmlFor="nome" className={styles.label}>Nome Completo</label>
              <input
                type="text"
                id="nome"
                className={styles.input}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="cpf" className={styles.label}>CPF</label>
              <input
                type="text"
                id="cpf"
                className={styles.input}
                value={cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                maxLength="14"
                required
              />
            </div>
            <div className={styles.checkboxContainer}>
              <input
                type="checkbox"
                id="consentimento"
                checked={consentimento}
                onChange={(e) => setConsentimento(e.target.checked)}
                className={styles.checkbox}
              />
              <label htmlFor="consentimento" className={styles.checkboxLabel}>
                Li e aceito o <Link to="/regulamento" target="_blank">Regulamento do Programa</Link> e a Política de Privacidade.
              </label>
            </div>
            <button
              type="submit"
              className={styles.button}
              disabled={carregando}
            >
              {carregando ? 'Cadastrando...' : 'Confirmar Cadastro'}
            </button>
          </div>
        </form>
        <Link to="/" className={styles.backLink}>
          &larr; Voltar para a página inicial
        </Link>
      </div>
    </div>
  );
}

export default CadastroPage;
