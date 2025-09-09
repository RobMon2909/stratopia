import React, { useState } from 'react';

interface Option {
    value: string;
    label: string;
}

interface EditableSelectProps {
    options: Option[];
    initialValue: string | null;
    onSave: (newValue: string | null) => void;
    children: React.ReactNode; // Lo que se muestra cuando no se está editando
}

const EditableSelect: React.FC<EditableSelectProps> = ({ options, initialValue, onSave, children }) => {
    const [isEditing, setIsEditing] = useState(false);
    
    const handleSave = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newValue = e.target.value || null;
        onSave(newValue);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <select
                value={initialValue || ''}
                onChange={handleSave}
                onBlur={() => setIsEditing(false)}
                className="p-1 border rounded bg-white shadow absolute z-10"
                autoFocus
            >
                <option value="">Sin asignar</option>
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        );
    }

    return (
        <div onClick={() => setIsEditing(true)} className="cursor-pointer p-1 rounded hover:bg-gray-100 w-full h-full">
            {children}
        </div>
    );
};

export default EditableSelect;