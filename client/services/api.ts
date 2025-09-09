import axios from 'axios';

// La URL base ahora apunta a tu dominio y a la carpeta /api
const API_URL = 'https://tu-dominio.com/api'; 

const api = axios.create({
  baseURL: API_URL,
});

// ¡IMPORTANTE! El interceptor de tokens JWT puede que no lo necesites
// si usas sesiones de PHP, pero lo dejamos por si implementas tokens.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token.replace(/"/g, '')}`;
  }
  return config;
});

// --- Auth ---
// Cada función ahora apunta a un archivo .php
export const registerUser = (data: any) => api.post('/register.php', data);
export const loginUser = (data: any) => api.post('/login.php', data);

// --- Workspaces ---
// Las peticiones GET a menudo llevan parámetros en la URL
export const getWorkspaces = () => api.get('/getWorkspaces.php');
export const getWorkspaceLists = (workspaceId: string) => api.get(`/getLists.php?workspaceId=${workspaceId}`);

// ...y así sucesivamente para cada funcionalidad que necesites.