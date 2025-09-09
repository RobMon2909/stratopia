import React, { useState, useEffect } from 'react';
import { adminGetAllWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace } from '../../services/api.ts';
import type { Workspace } from '../../types';
import WorkspaceEditModal from '../WorkspaceEditModal.tsx';

const WorkspaceManagement: React.FC = () => {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);

    useEffect(() => {
        const fetchWorkspaces = async () => {
            try {
                const res = await adminGetAllWorkspaces();
                if (Array.isArray(res.data)) setWorkspaces(res.data);
                else throw new Error("API response is not valid");
            } catch (err: any) {
                setError(err.response?.data?.message || 'Error loading workspaces.');
            } finally {
                setLoading(false);
            }
        };
        fetchWorkspaces();
    }, []);

    const handleOpenModal = (ws: Workspace | null) => {
        setEditingWorkspace(ws);
        setIsModalOpen(true);
    };

    const handleSaveWorkspace = async (workspaceData: any) => {
        try {
            if (editingWorkspace) {
                const res = await updateWorkspace({ ...workspaceData, id: editingWorkspace.id });
                setWorkspaces(workspaces.map(w => w.id === editingWorkspace.id ? res.data.workspace : w));
            } else {
                const res = await createWorkspace(workspaceData);
                setWorkspaces([res.data.workspace, ...workspaces]);
            }
            setIsModalOpen(false);
        } catch (error: any) {
            alert("Error al guardar workspace: " + (error.response?.data?.message || 'Desconocido'));
        }
    };

    const handleDeleteWorkspace = async (workspaceId: string, workspaceName: string) => {
        if (window.confirm(`¿Seguro que quieres eliminar "${workspaceName}"? Se borrarán TODAS sus listas y tareas.`)) {
            try {
                await deleteWorkspace(workspaceId);
                setWorkspaces(workspaces.filter(w => w.id !== workspaceId));
            } catch (error: any) { alert("Error al eliminar workspace: " + (error.response?.data?.message || 'Desconocido')); }
        }
    };

    if (loading) return <p className="text-gray-500">Cargando workspaces...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div>
            <WorkspaceEditModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveWorkspace} workspaceToEdit={editingWorkspace} />
             <div className="flex justify-end mb-4">
                <button onClick={() => handleOpenModal(null)} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">
                    + Crear Espacio
                </button>
            </div>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-3 font-semibold text-sm uppercase">Nombre del Espacio</th>
                                <th className="p-3 font-semibold text-sm uppercase text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {workspaces.map(ws => (
                                <tr key={ws.id} className="hover:bg-gray-50">
                                    <td className="p-3">{ws.name}</td>
                                    <td className="p-3 text-right space-x-4">
                                        <button onClick={() => handleOpenModal(ws)} className="text-blue-600 hover:underline font-semibold">Editar</button>
                                        <button onClick={() => handleDeleteWorkspace(ws.id, ws.name)} className="text-red-600 hover:underline font-semibold">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default WorkspaceManagement;