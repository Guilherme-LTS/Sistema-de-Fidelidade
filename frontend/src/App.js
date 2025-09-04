// frontend/src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Páginas
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/AdminLayout';
import DashboardPage from './pages/DashboardPage';
import OperacoesPage from './pages/OperacoesPage';
import ClientesPage from './pages/ClientesPage';
import PremiosPage from './pages/PremiosPage';
import AuditoriaPage from './pages/AuditoriaPage';
import RegulamentoPage from './pages/RegulamentoPage';
import CadastroPage from './pages/CadastroPage';

// Segurança
import AdminRoute from './auth/AdminRoute'; // Importe o novo segurança

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<CadastroPage />} />
        <Route path="/regulamento" element={<RegulamentoPage />} />
        
        {/* Grupo de Rotas do Admin */}
        <Route path="/admin" element={<AdminLayout />}>
          {/* Redirecionamento padrão */}
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          
          {/* Rotas de Admin */}
          <Route path="dashboard" element={<AdminRoute><DashboardPage /></AdminRoute>} />
          <Route path="premios" element={<AdminRoute><PremiosPage /></AdminRoute>} />
          <Route path="auditoria" element={<AdminRoute><AuditoriaPage /></AdminRoute>} />
          
          {/* Rotas de Operador (e Admin) */}
          <Route path="operacoes" element={<OperacoesPage />} />
          <Route path="clientes" element={<ClientesPage />} />
        </Route>
      </Routes>
      <ToastContainer position="top-right" autoClose={5000} theme="light" />
    </BrowserRouter>
  );
}

export default App;
