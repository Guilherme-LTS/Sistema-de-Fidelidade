// frontend/src/components/Layout.js
import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';

function Layout() {
  const location = useLocation();
  // Futuramente, podemos adicionar uma função de logout aqui
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/'; // Redireciona para a página de login
  };
  // Ícones SVG inline para Dashboard e Operações
  const dashboardIcon = (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M13 5v6h6m-6 0v6m0 0H7m6 0h6" /></svg>
  );
  const operacoesIcon = (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 10c-4.418 0-8-1.79-8-4V7a2 2 0 012-2h2m12 0a2 2 0 012 2v7c0 2.21-3.582 4-8 4z" /></svg>
  );
  // Responsividade: menu mobile
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const toggleSidebar = () => setSidebarOpen((open) => !open);

  return (
    <div className={styles.layoutContainer}>
      {/* Botão de menu para mobile */}
      <button className={styles.menuButton} onClick={toggleSidebar}>
        <span className={styles.menuIcon}>&#9776;</span>
      </button>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <h3>Fidelidade</h3>
        </div>
        <nav className={styles.nav}>
          <Link
            to="/home/dashboard"
            className={`${styles.navLink} ${location.pathname === '/home/dashboard' ? styles.active : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            {dashboardIcon}
            <span>Dashboard</span>
          </Link>
          <Link
            to="/home/operacoes"
            className={`${styles.navLink} ${location.pathname === '/home/operacoes' ? styles.active : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            {operacoesIcon}
            <span>Operações</span>
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