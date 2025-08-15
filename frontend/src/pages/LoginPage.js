// frontend/src/pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './LoginPage.module.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setCarregando(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha no login.');
      }
      toast.success('Login bem-sucedido!');
      localStorage.setItem('token', data.token);
      navigate('/admin/dashboard');
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
          Login do Operador
        </h1>
        <form onSubmit={handleLogin}>
          <div className={styles.stack}>
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>Email</label>
              <input
                type="email"
                id="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>Senha</label>
              <input
                type="password"
                id="password"
                className={styles.input}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className={styles.button}
              disabled={carregando}
            >
              {carregando ? 'Entrando...' : 'Entrar'}
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

export default LoginPage;