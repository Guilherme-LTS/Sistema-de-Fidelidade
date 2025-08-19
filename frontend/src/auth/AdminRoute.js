// frontend/src/auth/AdminRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { getUser } from './auth';

const AdminRoute = ({ children }) => {
  const usuario = getUser();

  // Acesso negado se não houver usuário ou se o cargo não for 'admin'
  if (!usuario || usuario.role !== 'admin') {
    // Redireciona para a primeira página que um operador pode ver
    return <Navigate to="/admin/operacoes" replace />;
  }

  // Acesso permitido
  return children;
};

export default AdminRoute;
