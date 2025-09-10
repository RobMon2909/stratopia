import axios from 'axios';
import type { Task } from '../types';

// La URL base de tu API de PHP
const API_URL = 'http://localhost:5000/stratopia/api'; // Asegúrate que esta ruta sea correcta

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor para añadir el token JWT a cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Autenticación y Usuario ---
export const login = (data: any) => api.post('/login.php', data);
export const register = (data: any) => api.post('/register.php', data);
export const getMe = () => api.get('/getMe.php');

// --- Workspaces ---
export const getWorkspaces = () => api.get('/getWorkspaces.php');
export const createWorkspace = (data: { name: string }) => api.post('/createWorkspace.php', data);
export const getWorkspaceMembers = (workspaceId: string) => api.get(`/getWorkspaceMembers.php?workspaceId=${workspaceId}`);

// --- Listas y Tareas ---
export const getWorkspaceLists = (workspaceId: string) => api.get(`/getLists.php?workspaceId=${workspaceId}`);
export const createTask = (taskData: any) => api.post('/createTask.php', taskData);
export const updateTask = (taskData: Partial<Task> & { taskId: string }) => api.put('/updateTask.php', taskData);
export const searchTasks = (workspaceId: string, searchTerm: string) => api.get(`/searchTasks.php?workspaceId=${workspaceId}&searchTerm=${searchTerm}`);

// --- Campos Personalizados ---
export const getCustomFields = (workspaceId: string) => api.get(`/getCustomFields.php?workspaceId=${workspaceId}`);
export const getFieldOptions = (fieldId: string) => api.get(`/getFieldOptions.php?fieldId=${fieldId}`);

// --- Archivos Adjuntos ---
export const getAttachments = (taskId: string) => api.get(`/getAttachments.php?taskId=${taskId}`);
export const uploadAttachment = (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append('taskId', taskId);
    formData.append('file', file);
    return api.post('/uploadAttachment.php', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};
export const deleteAttachment = (attachmentId: string) => api.post('/deleteAttachment.php', { attachmentId });


// --- NUEVAS FUNCIONES PARA COMENTARIOS ---
export const getComments = (taskId: string) => api.get(`/getComments.php?taskId=${taskId}`);
export const createComment = (data: { taskId: string; content: string }) => api.post('/createComment.php', data);

// --- Admin (Si tienes más, añádelas aquí) ---
// Nota: No he visto el código del frontend para el panel de admin, así que estas son suposiciones basadas en tus archivos PHP.
export const adminGetAllUsers = () => api.get('/getUsers.php');
export const adminUpdateUser = (userData: any) => api.put('/updateUser.php', userData);