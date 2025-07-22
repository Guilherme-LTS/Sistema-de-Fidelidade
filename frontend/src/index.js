// frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react'; // 1. Importe o provider
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* 2. Envolva o <App /> com o <ChakraProvider> */}
    <ChakraProvider>
      <App />
    </ChakraProvider>
  </React.StrictMode>
);