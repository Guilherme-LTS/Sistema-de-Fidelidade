import { jwtDecode } from 'jwt-decode';

export const getUser = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const decodedToken: any = jwtDecode(token);

    if (decodedToken.exp && decodedToken.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      localStorage.removeItem('userPerfil');
      return null;
    }

    const perfilStr = localStorage.getItem('userPerfil');
    if (perfilStr) {
      try {
        const perfilObj = JSON.parse(perfilStr);
        return { ...decodedToken, ...perfilObj };
      } catch (e) {}
    }

    return decodedToken;
  } catch (error) {
    console.error('Erro token:', error);
    return null;
  }
};
