import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import MarketingLandingPage from '../features/MarketingLandingPage';
import OriginalCustomerPage from '../pages/LandingPage';
import LoginPage from '../features/auth/LoginPage';
import AdminLayout from '../shared/layouts/AdminLayout';
import DashboardPage from '../features/DashboardPage';
import OperacoesPage from '../features/transacoes/OperacoesPage';
import ClientesPage from '../features/clientes/ClientesPage';
import PremiosPage from '../features/recompensas/PremiosPage';
import AuditoriaPage from '../features/AuditoriaPage';
import RegulamentoPage from '../features/RegulamentoPage';
import CadastroPage from '../features/auth/CadastroPage';
import AlterarSenhaPage from '../features/auth/AlterarSenhaPage';
import UsuariosPage from '../features/usuarios/UsuariosPage';
import ConfiguracoesContainer from '../features/configuracoes/ConfiguracoesContainer';
import AdminRoute from '../features/auth/AdminRoute';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MarketingLandingPage />} />
      <Route path="/meus-pontos" element={<OriginalCustomerPage />} />
      <Route path="/p/:tenantSlug" element={<OriginalCustomerPage />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />
      <Route path="/alterar-senha" element={<AlterarSenhaPage />} />
      <Route path="/regulamento" element={<RegulamentoPage />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminRoute><DashboardPage /></AdminRoute>} />
        <Route path="premios" element={<AdminRoute><PremiosPage /></AdminRoute>} />
        <Route path="auditoria" element={<AdminRoute><AuditoriaPage /></AdminRoute>} />
        <Route path="usuarios" element={<AdminRoute><UsuariosPage /></AdminRoute>} />
        <Route path="configuracoes" element={<AdminRoute><ConfiguracoesContainer /></AdminRoute>} />
        <Route path="operacoes" element={<OperacoesPage />} />
        <Route path="clientes" element={<ClientesPage />} />
        <Route path="alterar-senha" element={<AlterarSenhaPage />} />
      </Route>
    </Routes>
  );
}
