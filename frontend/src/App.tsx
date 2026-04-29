import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// PÃ¡ginas
import MarketingLandingPage from './features/MarketingLandingPage';
import OriginalCustomerPage from './pages/LandingPage';
import LoginPage from './features/auth/LoginPage';
import AdminLayout from './shared/layouts/AdminLayout';
import DashboardPage from './features/DashboardPage';
import OperacoesPage from './features/transacoes/OperacoesPage';
import ClientesPage from './features/clientes/ClientesPage';
import PremiosPage from './features/recompensas/PremiosPage';
import AuditoriaPage from './features/AuditoriaPage';
import RegulamentoPage from './features/RegulamentoPage';
import CadastroPage from './features/auth/CadastroPage';
import UsuariosPage from './features/usuarios/UsuariosPage';import ConfiguracoesPage from './features/ConfiguracoesPage';
// SeguranÃ§a
import AdminRoute from './features/auth/AdminRoute';

function App() {
  return (
    <BrowserRouter>
      
      <Routes>
        {/* Rotas Públicas */}
        {/* Nova Home: Marketing Landing Page foca no B2B */}
        <Route path="/" element={<MarketingLandingPage />} />
        
        {/* Portal do Cliente: Para consultar saldo */}
        <Route path="/meus-pontos" element={<OriginalCustomerPage />} />
        <Route path="/p/:tenantSlug" element={<OriginalCustomerPage />} />

        {/* Auth do Lojista */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<CadastroPage />} />
        <Route path="/regulamento" element={<RegulamentoPage />} />
        
        {/* Grupo de Rotas do Admin */}
        <Route path="/admin" element={<AdminLayout />}>
          {/* Redirecionamento padrÃ£o */}
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          
          {/* Rotas de Admin */}
          <Route path="dashboard" element={<AdminRoute><DashboardPage /></AdminRoute>} />
          <Route path="premios" element={<AdminRoute><PremiosPage /></AdminRoute>} />
          <Route path="auditoria" element={<AdminRoute><AuditoriaPage /></AdminRoute>} />
          <Route path="usuarios" element={<AdminRoute><UsuariosPage /></AdminRoute>} />
          <Route path="configuracoes" element={<AdminRoute><ConfiguracoesPage /></AdminRoute>} />

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


