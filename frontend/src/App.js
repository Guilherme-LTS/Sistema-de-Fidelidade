// frontend/src/App.js
import React from 'react';
import TransacaoForm from './components/TransacaoForm';
import './App.css'; // Vamos adicionar estilos aqui

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Sistema de Fidelidade</h1>
      </header>
      <main>
        <TransacaoForm />
      </main>
    </div>
  );
}

export default App;