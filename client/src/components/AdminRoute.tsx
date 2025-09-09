import React from 'react';
import { Navigate, Outlet } from 'react-router-dom'; // Asegúrate de importar Outlet
import { useAuth } from '../hooks/useAuth';

const AdminRoute: React.FC = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div>Verificando permisos...</div>;
    }

    // Si es Admin, renderiza el Outlet, que a su vez renderizará la página de admin.
    // Si no, lo redirige.
    return user && user.role === 'ADMIN' ? <Outlet /> : <Navigate to="/" />;
};

export default AdminRoute;