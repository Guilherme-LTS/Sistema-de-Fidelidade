// frontend/src/App.js - VERSÃO DE TESTE
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<h1>SE ISTO APARECER, A ROTA DE LOGIN FUNCIONA</h1>} />
        <Route path="/home" element={<h1>SE ISTO APARECER, A ROTA HOME FUNCIONA</h1>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;