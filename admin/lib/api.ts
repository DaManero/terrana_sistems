import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Adjunta el token JWT a cada request automáticamente
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('terrana_admin_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el backend devuelve 401, limpia la sesión y redirige al login
// (excepto si ya estamos en /login, para no interrumpir el manejo de errores del formulario)
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login')
    ) {
      localStorage.removeItem('terrana_admin_token');
      localStorage.removeItem('terrana_admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
