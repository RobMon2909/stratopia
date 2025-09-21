// client/src/components/MultiSelectDropdown.tsx

import React, { useState, useEffect, useRef } from 'react';
import type { FieldOption } from '../types';

interface MultiSelectDropdownProps {
    options: FieldOption[];
    selectedIds: string[];
    onChange: (selectedIds: string[]) => void;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ options, selectedIds, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    const handleSelect = (optionId: string) => {
        const newSelectedIds = selectedIds.includes(optionId)
            ? selectedIds.filter(id => id !== optionId)
            : [...selectedIds, optionId];
        onChange(newSelectedIds);
    };

    const selectedOptions = Array.isArray(options) ? options.filter(opt => selectedIds.includes(opt.id)) : [];

    return (
        <div className="relative" ref={dropdownRef}>
            <div onClick={() => setIsOpen(!isOpen)} className="w-full p-2 border border-border rounded-md bg-input cursor-pointer min-h-[42px] flex flex-wrap gap-1 items-center">
                {selectedOptions.length > 0 ? (
                    selectedOptions.map(opt => (
                        <span key={opt.id} style={{ backgroundColor: opt.color + '30', color: opt.color }} className="px-2 py-1 text-xs font-bold rounded">
                            {opt.value}
                        </span>
                    ))
                ) : (
                    <span className="text-foreground-secondary">-- Sin seleccionar --</span>
                )}
            </div>
            {isOpen && (
                <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {Array.isArray(options) && options.map(opt => (
                        <div key={opt.id} onClick={() => handleSelect(opt.id)} className="p-2 hover:bg-background-secondary cursor-pointer flex items-center">
                            <input
                                type="checkbox"
                                readOnly
                                checked={selectedIds.includes(opt.id)}
                                className="mr-3 h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
                            />
                            <span style={{ backgroundColor: opt.color + '30', color: opt.color }} className="px-2 py-1 text-xs font-bold rounded">
                                {opt.value}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MultiSelectDropdown;