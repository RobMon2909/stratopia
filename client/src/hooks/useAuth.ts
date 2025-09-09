import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext'; // Importa el contexto real

// Este es nuestro hook personalizado
export const useAuth = () => {
  // Usa el hook 'useContext' de React para acceder a nuestro AuthContext
  const context = useContext(AuthContext);

  // Si algún componente intenta usar este hook fuera del AuthProvider,
  // le daremos un error claro para saber qué pasa.
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }

  // Devuelve el valor del contexto (user, setUser, loading, logout)
  return context;
};