import React from 'react';

interface TagProps {
    text: string | null;
    color: string;
    icon?: React.ReactNode; // Prop opcional para un ícono
}

const Tag: React.FC<TagProps> = ({ text, color, icon }) => {
    if (!text) {
        return <span className="text-gray-400">-</span>;
    }

    // Generamos un color de fondo más claro (pastel) a partir del color base
    // Añadimos '25' al final del color hex para una opacidad del 15%
    const backgroundColor = color + '25';

    return (
        <div 
            className="flex items-center gap-x-1.5 rounded-full px-2.5 py-1 text-xs font-semibold w-fit"
            style={{ backgroundColor }}
        >
            {icon && <span style={{ color }}>{icon}</span>}
            <span style={{ color }} className="leading-none">{text}</span>
        </div>
    );
};

export default Tag;