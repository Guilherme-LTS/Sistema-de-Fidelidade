// frontend/src/App.js
import React from 'react';
import TransacaoForm from './components/TransacaoForm';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Sistema de Fidelidade</h1>
      </header>
      <main>
        <TransacaoForm />
      </main>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        bodyClassName="meu-body-de-toast"
      />
    </div>
  );
}

export default App;