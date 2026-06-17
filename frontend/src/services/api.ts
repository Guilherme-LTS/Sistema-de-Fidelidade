import axios from 'axios';

const configuredApiBaseUrl = process.env.REACT_APP_API_URL?.trim();
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !configuredApiBaseUrl) {
  throw new Error('REACT_APP_API_URL deve ser definido no ambiente de producao.');
}

export const API_BASE_URL = configuredApiBaseUrl || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Adiciona o token nas requisições, se existir
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepta respostas para tratamento global de erros
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Caso seja erro de rede (Servidor offline, etc)
    if (!error.response) {
      error.message = 'Erro de conexão com o servidor. Tente novamente mais tarde.';
      return Promise.reject(error);
    }

    // Tratamento de erros baseados no status HTTP
    const status = error.response.status;
    const data = error.response.data;

    // Se a API backend estiver padronizada, ela envia a mensagem em "data.error" ou "data.message"
    const errorMessage = data?.error || data?.message || 'Ocorreu um erro inesperado.';

    // 401: Token expirado ou inválido
    if (status === 401) {
      localStorage.removeItem('token');
      // Só redireciona se não estiver já na página de login
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
      error.message = 'Sessão expirada. Por favor, faça login novamente.';
    } else {
      error.message = errorMessage;
    }

    return Promise.reject(error);
  }
);

export default api;
