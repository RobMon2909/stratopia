import React, { useState, useEffect } from 'react';
import type { User, Workspace } from '../types';
import { adminGetAllWorkspaces, getUserWorkspaces } from '../services/api';

// --- CORRECCIÓN CLAVE ---
// La interface ahora define correctamente todas las propiedades que el componente necesita.
interface UserEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (userData: any) => void;
    userToEdit: User | null;
}

const UserEditModal: React.FC<UserEditModalProps> = ({ isOpen, onClose, onSave, userToEdit }) => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'MEMBER' });
    const [error, setError] = useState('');
    
    const [allWorkspaces, setAllWorkspaces] = useState<Workspace[]>([]);
    const [assignedWorkspaces, setAssignedWorkspaces] = useState<string[]>([]);
    
    const isEditMode = userToEdit !== null;

    useEffect(() => {
        if (isOpen) {
            adminGetAllWorkspaces().then(res => setAllWorkspaces(res.data)).catch(err => console.error("Failed to load workspaces", err));
            
            if (isEditMode && userToEdit) {
                setFormData({ ...userToEdit, password: '' });
                getUserWorkspaces(userToEdit.id).then(res => setAssignedWorkspaces(res.data)).catch(err => console.error("Failed to load user workspaces", err));
            } else {
                setFormData({ name: '', email: '', password: '', role: 'MEMBER' });
                setAssignedWorkspaces([]);
            }
            setError('');
        }
    }, [isOpen, userToEdit, isEditMode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleWorkspaceChange = (workspaceId: string) => {
        setAssignedWorkspaces(prev => 
            prev.includes(workspaceId) 
                ? prev.filter(id => id !== workspaceId)
                : [...prev, workspaceId]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email) {
            setError('Nombre y email son requeridos.'); return;
        }
        if (!isEditMode && (!formData.password || formData.password.length < 6)) {
            setError('La contraseña es requerida y debe tener al menos 6 caracteres.'); return;
        }
        onSave({ ...formData, workspaceIds: assignedWorkspaces });
    };

    if (!isOpen) return null;

     return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-card text-card-foreground p-6 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4">{isEditMode ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground-secondary">Nombre</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border border-border rounded mt-1 bg-input text-foreground"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground-secondary">Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border border-border rounded mt-1 bg-input text-foreground"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground-secondary">Contraseña</label>
                        <input type="password" name="password" value={formData.password} placeholder={isEditMode ? 'Dejar en blanco para no cambiar' : ''} className="w-full p-2 border border-border rounded mt-1 bg-input text-foreground"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground-secondary">Rol</label>
                        <select name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border border-border rounded mt-1 bg-input text-foreground">
                            <option value="ADMIN">Admin</option>
                            <option value="MEMBER">Miembro</option>
                            <option value="VIEWER">Observador</option>
                        </select>
                    </div>
                    
                    {isEditMode && (
                        <div>
                            <label className="block text-sm font-medium text-foreground-secondary">Asignar a Espacios de Trabajo</label>
                            <div className="mt-2 border border-border rounded p-2 h-32 overflow-y-auto bg-background-secondary">
                                {allWorkspaces.length > 0 ? allWorkspaces.map(ws => (
                                    <div key={ws.id}>
                                        <label className="flex items-center space-x-2">
                                            <input type="checkbox" checked={assignedWorkspaces.includes(ws.id)} onChange={() => handleWorkspaceChange(ws.id)} />
                                            <span>{ws.name}</span>
                                        </label>
                                    </div>
                                )) : <p className="text-sm text-foreground-secondary">No hay workspaces creados.</p>}
                            </div>
                        </div>
                    )}

                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserEditModal;