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
import PremiosPage from './pages/PremiosPage';
import ClientesPage from './pages/ClientesPage';
import AuditoriaPage from './pages/AuditoriaPage'; // Página de auditoria

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Grupo de Rotas do Admin */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="operacoes" element={<OperacoesPage />} />
          <Route path="premios" element={<PremiosPage />} />
          <Route path="clientes" element={<ClientesPage />} />
          <Route path="auditoria" element={<AuditoriaPage />} />
          
        </Route>
      </Routes>
      <ToastContainer position="top-right" autoClose={5000} theme="light" />
    </BrowserRouter>
  );
}

export default App;