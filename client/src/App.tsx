// client/src/App.tsx

import { Routes, Route, Navigate } from 'react-router-dom'; // Se quita BrowserRouter de aquí
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage.tsx'; 
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
// NOTA: AuthProvider ya no se importa ni se usa aquí, se usa en main.tsx

function App() {
  return (
    // El AuthProvider fue movido a main.tsx para envolver toda la app
    <Routes>
      {/* Rutas Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Grupo de rutas para usuarios logueados */}
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<DashboardPage />} />
      </Route>

      {/* Grupo de rutas SOLO para Admins */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* Redirigir cualquier otra ruta desconocida */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;