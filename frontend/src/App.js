// frontend/src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Importações das Páginas
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import OperacoesPage from './pages/OperacoesPage';

// Importação do Protetor de Rotas
import ProtectedRoute from './auth/ProtectedRoute';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Pública Principal */}
        <Route path="/" element={<LandingPage />} />

        {/* Rota Pública de Login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Grupo de Rotas Protegidas do Admin */}
        <Route
          path="/admin" // Todas as rotas de admin começarão com /admin
          element={<ProtectedRoute><HomePage /></ProtectedRoute>}
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="operacoes" element={<OperacoesPage />} />
        </Route>
      </Routes>
      <ToastContainer position="top-right" autoClose={5000} theme="light" />
    </BrowserRouter>
  );
}

export default App;