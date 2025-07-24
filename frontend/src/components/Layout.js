// frontend/src/components/Layout.js
import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import styles from './Layout.module.css';

function Layout() {
  // Futuramente, podemos adicionar uma função de logout aqui
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/'; // Redireciona para a página de login
  };

  return (
    <div className={styles.layoutContainer}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h3>Fidelidade</h3>
        </div>
        <nav className={styles.nav}>
          <Link to="/home/dashboard" className={styles.navLink}>
            Dashboard
          </Link>
          <Link to="/home/operacoes" className={styles.navLink}>
            Operações
          </Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <button onClick={handleLogout} className={styles.logoutButton}>
            Sair
          </button>
        </div>
      </aside>
      <main className={styles.mainContent}>
        {/* O <Outlet> é onde as páginas (Dashboard, Operações) serão renderizadas */}
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;