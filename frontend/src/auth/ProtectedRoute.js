// frontend/src/auth/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

// Este componente recebe os 'children', que são os componentes que ele deve proteger
const ProtectedRoute = ({ children }) => {
  // 1. Verificamos se o token existe no localStorage
  const token = localStorage.getItem('token');

  // 2. Se não houver token, redirecionamos para a página de login
  if (!token) {
    // O componente <Navigate> do React Router faz o redirecionamento
    return <Navigate to="/" />;
  }

  // 3. Se houver um token, renderizamos os componentes filhos (a página protegida)
  return children;
};

export default ProtectedRoute;