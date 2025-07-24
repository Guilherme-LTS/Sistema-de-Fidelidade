// frontend/src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ProtectedRoute from './auth/ProtectedRoute';
import DashboardPage from './pages/DashboardPage'; // Importe as novas páginas
import OperacoesPage from './pages/OperacoesPage'; // Importe as novas páginas

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        <Route
          path="/home"
          element={<ProtectedRoute><HomePage /></ProtectedRoute>}
        >
          {/* Rotas Aninhadas: Elas serão renderizadas dentro do <Outlet> do Layout */}
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