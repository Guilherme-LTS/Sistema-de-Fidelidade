// frontend/src/pages/AdminLayout.js
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Layout from '../components/Layout'; // Nosso componente visual com a sidebar

function AdminLayout() {
  // 1. A lógica de proteção agora mora aqui
  const token = localStorage.getItem('token');

  // 2. Se não houver token, redireciona para a tela de login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 3. Se houver token, renderiza o Layout (com a sidebar e o <Outlet />)
  return <Layout />;
}

export default AdminLayout;