// client/src/components/ThemeToggleButton.tsx
import React from 'react';
import { useTheme } from '../context/ThemeContext';
// Para los iconos, puedes usar una librería como lucide-react:
// npm install lucide-react
import { Sun, Moon } from 'lucide-react';

export const ThemeToggleButton: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        background: 'none',
        border: '1px solid var(--border-color)',
        borderRadius: '9999px',
        cursor: 'pointer',
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-primary)'
      }}
    >
      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
};