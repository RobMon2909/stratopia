import React, { createContext, useState, useEffect } from 'react';
// CAMBIO: Se usa 'import type' para el tipo ReactNode.
import type { ReactNode } from 'react';
import { getMe } from '../services/api';
import { Spinner } from '../components/ui/Spinner';
import type { User } from '../types'; // También aplicamos la regla aquí.

// El resto del archivo no cambia, pero lo incluyo para que sea completo.
interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await getMe();
          setUser(res.data);
        } catch (error) {
          console.error("Session check failed, token is invalid.", error);
          logout(); 
        }
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <Spinner />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};