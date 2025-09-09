import axios from 'axios';
import type { Task, User, Workspace, CustomField, FieldOption } from '../types';

const API_URL = 'http://localhost:8008/stratopia/api'; 

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token.replace(/"/g, '')}`;
    }
    return config;
}, (error) => { return Promise.reject(error); });

// --- Auth Endpoints ---
export const registerUser = (data: any) => api.post('/register.php', data);
export const loginUser = (data: any) => api.post('/login.php', data);
export const getMe = () => api.get('/getMe.php');

// --- Workspaces (User-facing) ---
export const getWorkspaces = () => api.get('/getWorkspaces.php');
export const getWorkspaceLists = (workspaceId: string) => api.get(`/getLists.php?workspaceId=${workspaceId}`);
export const getWorkspaceMembers = (workspaceId: string) => api.get(`/getWorkspaceMembers.php?workspaceId=${workspaceId}`);

// --- Lists ---
export const createList = (data: { name: string, workspaceId: string }) => api.post('/createList.php', data);

// --- Tasks ---
export const createTask = (taskData: any) => api.post('/createTask.php', taskData);
export const updateTask = (taskData: any) => api.post('/updateTask.php', taskData);
export const updateTaskStatus = (taskId: string, fieldId: string, newOptionId: string, newValue: string) => 
    api.post('/updateTaskStatus.php', { taskId, fieldId, newOptionId, newValue });

// --- Attachments ---
export const getAttachments = (taskId: string) => api.get(`/getAttachments.php?taskId=${taskId}`);
export const uploadAttachment = (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append('taskId', taskId);
    formData.append('file', file);
    return api.post('/uploadAttachment.php', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const deleteAttachment = (attachmentId: string) => api.post('/deleteAttachment.php', { attachmentId });

// --- Admin: Users ---
export const getAllUsers = () => api.get('/getUsers.php');
export const createUser = (userData: Partial<User>) => api.post('/createUser.php', userData);
export const updateUser = (userData: Partial<User>) => api.post('/updateUser.php', userData);
export const deleteUser = (userId: string) => api.post('/deleteUser.php', { userId });

// --- Admin: Workspaces & Permissions ---
export const adminGetAllWorkspaces = () => api.get('/adminGetAllWorkspaces.php');
export const createWorkspace = (data: { name: string }) => api.post('/createWorkspace.php', data);
export const updateWorkspace = (workspaceData: {id: string, name: string}) => api.post('/updateWorkspace.php', workspaceData);
export const deleteWorkspace = (workspaceId: string) => api.post('/deleteWorkspace.php', { workspaceId });
export const getUserWorkspaces = (userId: string) => api.get(`/getUserWorkspaces.php?userId=${userId}`);
export const updateUserWorkspaces = (userId: string, workspaceIds: string[]) => api.post('/updateUserWorkspaces.php', { userId, workspaceIds });

// --- Admin: Custom Fields & Options ---
export const getCustomFields = (workspaceId: string) => api.get(`/getCustomFields.php?workspaceId=${workspaceId}`);
export const createCustomField = (fieldData: { workspaceId: string, name: string, type: string }) => api.post('/createCustomField.php', fieldData);
export const updateCustomField = (fieldData: { id: string, name: string, type: string }) => api.post('/updateCustomField.php', fieldData);
export const deleteCustomField = (fieldId: string) => api.post('/deleteCustomField.php', { fieldId });
export const getFieldOptions = (fieldId: string) => api.get(`/getFieldOptions.php?fieldId=${fieldId}`);
export const createFieldOption = (optionData: { fieldId: string, value: string, color: string }) => api.post('/createFieldOption.php', optionData);
export const deleteFieldOption = (optionId: string) => api.post('/deleteFieldOption.php', { optionId });
export const updateFieldOption = (optionData: { optionId: string, value: string, color: string }) => api.post('/updateFieldOption.php', optionData);
export const updateFieldOptionsOrder = (optionIds: string[]) => api.post('/updateFieldOptionsOrder.php', { optionIds });

// --- Search Endpoint ---
export const searchTasks = (workspaceId: string, searchTerm: string) => 
    api.get(`/searchTasks.php?workspaceId=${workspaceId}&searchTerm=${encodeURIComponent(searchTerm)}`);