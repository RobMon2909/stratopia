import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage.tsx'; 
import PrivateRoute from './components/PrivateRoute'; // Importamos los protectores de ruta
import AdminRoute from './components/AdminRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* --- NUEVA ESTRUCTURA DE RUTAS PROTEGIDAS --- */}
          
          {/* Grupo de rutas para usuarios logueados */}
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<DashboardPage />} />
            {/* Aquí podrías añadir más rutas privadas normales, ej: /profile */}
          </Route>

          {/* Grupo de rutas SOLO para Admins */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
            {/* Aquí podrías añadir más rutas de admin, ej: /admin/settings */}
          </Route>

          {/* Redirigir cualquier otra ruta desconocida */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;