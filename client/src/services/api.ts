import axios from 'axios';
// Asegúrate de que la ruta a tus tipos sea correcta
import type { Task, User, Workspace, CustomField } from '../types'; 

// La URL base de tu API de PHP
const API_URL = 'http://localhost:8008/stratopia/api'; // O la ruta correcta donde tengas tu backend

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor para añadir el token JWT a cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  // Corregido: El token no debe estar entre comillas extras si ya es un string
  if (token) {
    const parsedToken = JSON.parse(token); // Asumiendo que el token se guarda como un string JSON
    config.headers.Authorization = `Bearer ${parsedToken}`;
  }
  return config;
});

/*
 * ===================================================================
 * TIPOS DE PAYLOAD ESPECÍFICOS PARA CORREGIR ERRORES DE TYPESCRIPT
 * ===================================================================
 */
interface CustomFieldPayload {
    fieldId: string;
    value?: any;
    valueId?: string;
    optionId?: string | null;
    optionIds?: string[];
    type?: string;
}

interface UpdateTaskPayload {
    taskId: string;
    title?: string;
    description?: string;
    dueDate?: string | null;
    priority?: string | null;
    assigneeIds?: string[];
    customFields?: CustomFieldPayload[];
}


// --- Autenticación y Usuario ---
export const loginUser = (data: any) => api.post('/login.php', data); // <-- NOMBRE CORREGIDO
export const registerUser = (data: any) => api.post('/register.php', data); // <-- NOMBRE CORREGIDO
export const getMe = () => api.get<User>('/getMe.php');

// --- Workspaces (General) ---
export const getWorkspaces = () => api.get<Workspace[]>('/getWorkspaces.php');
export const getWorkspaceMembers = (workspaceId: string) => api.get<User[]>(`/getWorkspaceMembers.php?workspaceId=${workspaceId}`);

// --- Listas y Tareas ---
export const getWorkspaceLists = (workspaceId: string, groupBy: string) => 
    api.get(`/getLists.php?workspaceId=${workspaceId}&groupBy=${groupBy}`);
export const createList = (data: { workspaceId: string, name: string }) => api.post('/createList.php', data);
export const createTask = (taskData: any) => api.post('/createTask.php', taskData);
export const updateTask = (taskData: UpdateTaskPayload) => api.put('/updateTask.php', taskData);
export const searchTasks = (workspaceId: string, searchTerm: string) => api.get<Task[]>(`/searchTasks.php?workspaceId=${workspaceId}&searchTerm=${searchTerm}`);

// --- Campos Personalizados (General) ---
export const getCustomFields = (workspaceId: string) => api.get<CustomField[]>(`/getCustomFields.php?workspaceId=${workspaceId}`);
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

// --- Comentarios ---
export const getComments = (taskId: string) => api.get(`/getComments.php?taskId=${taskId}`);
export const createComment = (data: { taskId: string; content: string }) => api.post('/createComment.php', data);

/*
 * ===================================================================
 * FUNCIONES PARA EL PANEL DE ADMINISTRADOR
 * ===================================================================
 */

// --- Gestión de Usuarios (Admin) ---
export const getAllUsers = () => api.get<User[]>('/getUsers.php');
export const createUser = (userData: any) => api.post('/createUser.php', userData);
export const updateUser = (userData: any) => api.put('/updateUser.php', userData);
export const deleteUser = (userId: string) => api.post('/deleteUser.php', { userId });
export const getUserWorkspaces = (userId: string) => api.get<string[]>(`/getUserWorkspaces.php?userId=${userId}`);
export const updateUserWorkspaces = (userId: string, workspaceIds: string[]) => api.put('/updateUserWorkspaces.php', { userId, workspaceIds });

// --- Gestión de Workspaces (Admin) ---
export const adminGetAllWorkspaces = () => api.get<Workspace[]>('/adminGetAllWorkspaces.php');
export const createWorkspace = (data: { name: string }) => api.post('/createWorkspace.php', data);
export const updateWorkspace = (workspaceData: any) => api.put('/updateWorkspace.php', workspaceData);
export const deleteWorkspace = (workspaceId: string) => api.post('/deleteWorkspace.php', { workspaceId });

// --- Gestión de Campos Personalizados (Admin) ---
export const createCustomField = (data: { name: string; type: string; workspaceId: string }) => api.post('/createCustomField.php', data);
export const updateCustomField = (fieldData: any) => api.put('/updateCustomField.php', fieldData);
export const deleteCustomField = (fieldId: string) => api.post('/deleteCustomField.php', { fieldId });
export const createFieldOption = (optionData: any) => api.post('/createFieldOption.php', optionData);
export const updateFieldOption = (optionData: any) => api.put('/updateFieldOption.php', optionData);
export const deleteFieldOption = (optionId: string) => api.post('/deleteFieldOption.php', { optionId });
export const updateFieldOptionsOrder = (optionIds: string[]) => api.put('/updateFieldOptionsOrder.php', { optionIds });

// --- FUNCIONES PARA NOTIFICACIONES ---
export const getNotifications = () => api.get('/getNotifications.php');
export const markNotificationsAsRead = () => api.post('/markNotificationsAsRead.php');

// --- AÑADE ESTAS FUNCIONES ---
export const createTaskDependency = (data: { blockingTaskId: string, waitingTaskId: string }) => 
    api.post('/createTaskDependency.php', data);

export const deleteTaskDependency = (data: { blockingTaskId: string, waitingTaskId: string }) => 
    api.post('/deleteTaskDependency.php', data);