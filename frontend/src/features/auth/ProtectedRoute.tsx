// // frontend/src/auth/ProtectedRoute.js
// import React from 'react';
// import { Navigate } from 'react-router-dom';

// const ProtectedRoute = ({ children }) => {
//   // 1. Verificamos se o token de acesso existe no localStorage do navegador
//   const token = localStorage.getItem('token');

//   // 2. Se NÃO houver token, redirecionamos o usuário para a página de login
//   if (!token) {
//     // O componente <Navigate> do React Router faz o redirecionamento
//     // `replace` impede que o usuário use o botão "voltar" para acessar a página protegida
//     return <Navigate to="/login" replace />;
//   }

//   // 3. Se houver um token, permitimos a passagem e renderizamos a página solicitada
//   return children;
// };

// export default ProtectedRoute;