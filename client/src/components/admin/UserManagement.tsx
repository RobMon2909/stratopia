import React, { useState, useEffect } from 'react';
import { getAllUsers, createUser, updateUser, deleteUser, updateUserWorkspaces } from '../../services/api.ts';
import { useAuth } from '../../hooks/useAuth.ts';
import type { User } from '../../types';
import UserEditModal from '../UserEditModal.tsx';

const UserManagement: React.FC = () => {
    const { user: adminUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await getAllUsers();
                if (Array.isArray(res.data)) {
                    setUsers(res.data);
                } else {
                    throw new Error("API response is not a valid format.");
                }
            } catch (err: any) {
                setError(err.response?.data?.message || 'Permission denied or an error occurred.');
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handleOpenModal = (user: User | null) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleSaveUser = async (userData: any) => {
        try {
            if (editingUser) {
                const resUser = await updateUser({ ...userData, id: editingUser.id, createdAt: editingUser.createdAt });
                await updateUserWorkspaces(editingUser.id, userData.workspaceIds);
                setUsers(users.map(u => u.id === editingUser.id ? resUser.data.user : u));
            } else {
                const res = await createUser(userData);
                setUsers([res.data.user, ...users]);
            }
            setIsModalOpen(false);
        } catch (error: any) {
            alert("Error al guardar: " + (error.response?.data?.message || "Error desconocido"));
        }
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar al usuario "${userName}"? Esta acción es irreversible.`)) {
            try {
                await deleteUser(userId);
                setUsers(users.filter(u => u.id !== userId));
            } catch (error: any) {
                alert("Error al eliminar: " + (error.response?.data?.message || "Error desconocido"));
            }
        }
    };

    if (loading) return <p className="text-gray-500">Cargando usuarios...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div>
            <UserEditModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveUser}
                userToEdit={editingUser}
            />
            <div className="flex justify-end mb-4">
                <button onClick={() => handleOpenModal(null)} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">
                    + Crear Usuario
                </button>
            </div>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-3 font-semibold text-sm uppercase">Nombre</th>
                                <th className="p-3 font-semibold text-sm uppercase">Email</th>
                                <th className="p-3 font-semibold text-sm uppercase">Rol</th>
                                <th className="p-3 font-semibold text-sm uppercase text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="p-3">{user.name}</td>
                                    <td className="p-3">{user.email}</td>
                                    <td className="p-3">{user.role}</td>
                                    <td className="p-3 text-right space-x-4">
                                        <button onClick={() => handleOpenModal(user)} className="text-blue-600 hover:underline font-semibold">Editar</button>
                                        {user.id !== adminUser?.id && (
                                            <button onClick={() => handleDeleteUser(user.id, user.name)} className="text-red-600 hover:underline font-semibold">Eliminar</button>
                                        )}
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

export default UserManagement;