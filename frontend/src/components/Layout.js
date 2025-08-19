// frontend/src/components/Layout.js
import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import styles from './Layout.module.css';
import { getUser } from '../auth/auth'; 

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const usuario = getUser();

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  return (
    <div className={styles.layoutContainer}>
      <button className={styles.menuButton} onClick={() => setSidebarOpen(!sidebarOpen)}>
        <span className={styles.menuIcon}>&#9776;</span>
      </button>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <h3>Fidelidade</h3>
          {/* Mostra o nome e o cargo do usuário */}
          {usuario && <span className={styles.userInfo}>{usuario.nome} ({usuario.role})</span>}
        </div>
        <nav className={styles.nav}>
          {/* 3. Lógica condicional: só mostra o link se o usuário for 'admin' */}
          {usuario && usuario.role === 'admin' && (
            <NavLink to="/admin/dashboard" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
              Dashboard
            </NavLink>
          )}

          <NavLink to="/admin/operacoes" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
            Operações
          </NavLink>
          <NavLink to="/admin/clientes" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
            Clientes
          </NavLink>
          
          {usuario && usuario.role === 'admin' && (
            <NavLink to="/admin/premios" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
              Gerenciar Prêmios
            </NavLink>
          )}
          {usuario && usuario.role === 'admin' && (
            <NavLink to="/admin/auditoria" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
              Auditoria
            </NavLink>
          )}
        </nav>
        <div className={styles.sidebarFooter}>
          <button onClick={handleLogout} className={styles.logoutButton}>
            Sair
          </button>
        </div>
      </aside>
      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
