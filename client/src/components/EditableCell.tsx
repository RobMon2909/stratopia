import React, { useState, useEffect } from 'react';

interface EditableCellProps {
    initialValue: string;
    onSave: (newValue: string) => void;
}

const EditableCell: React.FC<EditableCellProps> = ({ initialValue, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);

    // Asegura que el valor se actualice si la prop inicial cambia desde fuera
    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    const handleSave = () => {
        if (value.trim() && value !== initialValue) {
            onSave(value);
        } else {
            setValue(initialValue); // Revertir si está vacío o no cambió
        }
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={handleSave} // Guarda al hacer clic fuera
                onKeyDown={(e) => { 
                    if (e.key === 'Enter') handleSave(); 
                    if (e.key === 'Escape') {
                        setValue(initialValue);
                        setIsEditing(false);
                    }
                }} // Guarda con Enter, cancela con Esc
                className="w-full p-1 border rounded bg-white shadow z-10 relative"
                autoFocus
            />
        );
    }

    return (
        <div onClick={() => setIsEditing(true)} className="max-w-xs truncate cursor-pointer p-1 rounded hover:bg-gray-100" title={value}>
            {value}
        </div>
    );
};

export default EditableCell;