import React, { useState, useEffect } from 'react';
import type { Workspace } from '../types';

interface WorkspaceEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (workspaceData: any) => void;
    workspaceToEdit: Workspace | null;
}

const WorkspaceEditModal: React.FC<WorkspaceEditModalProps> = ({ isOpen, onClose, onSave, workspaceToEdit }) => {
    const [name, setName] = useState('');
    const isEditMode = workspaceToEdit !== null;

    useEffect(() => {
        if (isOpen) {
            setName(isEditMode ? workspaceToEdit.name : '');
        }
    }, [isOpen, workspaceToEdit, isEditMode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center" onClick={onClose}>
            {/* Fondo sólido con 'bg-card' */}
            <div className="bg-card text-card-foreground p-6 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4">{isEditMode ? 'Editar Workspace' : 'Crear Nuevo Workspace'}</h2>
                <form onSubmit={handleSubmit}>
                    <label className="block text-sm font-medium text-foreground-secondary">Nombre del Workspace</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-border rounded-md mt-1 bg-input text-foreground"/>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
export default WorkspaceEditModal;