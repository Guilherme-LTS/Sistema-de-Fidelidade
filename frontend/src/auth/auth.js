// frontend/src/auth/auth.js
import { jwtDecode } from 'jwt-decode';

/**
 * Decodifica o token JWT do localStorage para obter os dados do usuário.
 * Também verifica se o token não expirou.
 * @returns {object|null} O objeto do usuário (com id, nome, role) ou null se não houver token ou se ele estiver expirado.
 */
export const getUser = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return null;
  }

  try {
    const decodedToken = jwtDecode(token);
    
    // Verifica se o token expirou (a data de expiração está em segundos, convertemos para milissegundos)
    if (decodedToken.exp * 1000 < Date.now()) {
      localStorage.removeItem('token'); // Limpa o token expirado
      return null;
    }
    
    return decodedToken; // Retorna os dados do usuário: { id, nome, role, iat, exp }
  } catch (error) {
    console.error("Falha ao decodificar o token:", error);
    return null;
  }
};
