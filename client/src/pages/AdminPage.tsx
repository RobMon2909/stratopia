import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import UserManagement from '../components/admin/UserManagement.tsx';
import WorkspaceManagement from '../components/admin/WorkspaceManagement.tsx';
import CustomFieldManagement from '../components/admin/CustomFieldManagement.tsx';

type AdminTab = 'users' | 'workspaces' | 'fields';

const AdminPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AdminTab>('users');

    const renderContent = () => {
        switch (activeTab) {
            case 'users':
                return <UserManagement />;
            case 'workspaces':
                return <WorkspaceManagement />;
            case 'fields':
                return <CustomFieldManagement />;
            default:
                return null;
        }
    };

    const getTabClass = (tabName: AdminTab) => {
        return activeTab === tabName
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
    };

    return (
        <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Panel de Administrador</h1>
                    <Link to="/" className="text-blue-600 hover:underline font-semibold">
                        &larr; Volver al Dashboard
                    </Link>
                </div>

                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button onClick={() => setActiveTab('users')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${getTabClass('users')}`}>
                            Usuarios
                        </button>
                        <button onClick={() => setActiveTab('workspaces')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${getTabClass('workspaces')}`}>
                            Espacios de Trabajo
                        </button>
                        <button onClick={() => setActiveTab('fields')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${getTabClass('fields')}`}>
                            Campos Personalizados
                        </button>
                    </nav>
                </div>

                <div className="mt-8">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default AdminPage;