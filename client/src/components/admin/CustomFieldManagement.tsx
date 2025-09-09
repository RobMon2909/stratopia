import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { adminGetAllWorkspaces, getCustomFields, createCustomField, updateCustomField, deleteCustomField, getFieldOptions, createFieldOption, deleteFieldOption, updateFieldOptionsOrder, updateFieldOption } from '../../services/api.ts';
import type { Workspace, CustomField } from '../../types';

interface FieldOption { 
    id: string; 
    value: string; 
    color: string; 
    sortOrder?: number;
}

// Sub-Componente: Modal para Editar Campos (Nombre y Tipo)
const FieldEditModal: React.FC<{
    isOpen: boolean; onClose: () => void; onSave: (fieldData: any) => void;
    fieldToEdit: CustomField | null;
}> = ({ isOpen, onClose, onSave, fieldToEdit }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState('text');
    useEffect(() => {
        if (fieldToEdit) { setName(fieldToEdit.name); setType(fieldToEdit.type); }
    }, [fieldToEdit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, type });
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">Editar Campo Personalizado</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="block text-sm font-medium">Nombre del Campo</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded mt-1"/></div>
                     <div><label className="block text-sm font-medium">Tipo de Campo</label><select value={type} onChange={e => setType(e.target.value)} className="w-full p-2 border rounded mt-1 bg-white"><option value="text">Texto</option><option value="dropdown">Lista desplegable</option><option value="labels">Etiquetas</option><option value="files">Archivos</option></select></div>
                    <div className="flex justify-end gap-4 mt-4"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Guardar</button></div>
                </form>
            </div>
        </div>
    );
};

const CustomFieldManagement: React.FC = () => {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingFields, setLoadingFields] = useState(false);
    
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldType, setNewFieldType] = useState('text');
    
    const [editingField, setEditingField] = useState<CustomField | null>(null);
    const [currentOptions, setCurrentOptions] = useState<FieldOption[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [newOptionValue, setNewOptionValue] = useState('');
    const [newOptionColor, setNewOptionColor] = useState('#6B7280');

    // Estados para edición inline de opciones
    const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
    const [editingOptionValue, setEditingOptionValue] = useState('');
    const [editingOptionColor, setEditingOptionColor] = useState('#000000');

    const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
    const [editingFieldData, setEditingFieldData] = useState<CustomField | null>(null);

    useEffect(() => {
        setLoading(true);
        adminGetAllWorkspaces().then(res => {
            setWorkspaces(res.data);
            if (res.data.length > 0) {
                setSelectedWorkspace(res.data[0].id);
            }
        }).catch(err => { console.error("Error al cargar workspaces:", err); })
        .finally(() => { setLoading(false); });
    }, []);

    useEffect(() => {
        if (selectedWorkspace) {
            setLoadingFields(true); setCustomFields([]); setEditingField(null);
            getCustomFields(selectedWorkspace)
                .then(res => setCustomFields(res.data))
                .catch(err => console.error("Error fetching fields", err))
                .finally(() => setLoadingFields(false));
        }
    }, [selectedWorkspace]);

    const handleCreateField = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFieldName.trim() || !selectedWorkspace) return;
        try {
            const res = await createCustomField({ workspaceId: selectedWorkspace, name: newFieldName, type: newFieldType });
            setCustomFields([...customFields, res.data.field]);
            setNewFieldName('');
        } catch (error: any) { alert('Error al crear el campo: ' + (error.response?.data?.message || 'Error desconocido')); }
    };
    
    const handleOpenFieldModal = (field: CustomField | null) => {
        setEditingFieldData(field);
        setIsFieldModalOpen(true);
    };

    const handleSaveField = async (fieldData: any) => {
        if (editingFieldData) {
            try {
                const res = await updateCustomField({ ...fieldData, id: editingFieldData.id });
                setCustomFields(customFields.map(f => f.id === editingFieldData.id ? res.data.field : f));
            } catch (error: any) { alert('Error al editar campo: ' + (error.response?.data?.message || 'Error desconocido')); }
        }
        setIsFieldModalOpen(false);
    };

    const handleDeleteField = async (fieldId: string, fieldName: string) => {
        if (window.confirm(`¿Seguro que quieres eliminar el campo "${fieldName}"? Se borrarán todos sus datos.`)) {
            try {
                await deleteCustomField(fieldId);
                setCustomFields(customFields.filter(f => f.id !== fieldId));
            } catch (error: any) { alert('Error al eliminar campo: ' + (error.response?.data?.message || 'Error desconocido')); }
        }
    };

    const handleSelectFieldToEdit = (field: CustomField) => {
        if (editingField?.id === field.id) {
            setEditingField(null);
        } else {
            setEditingField(field); setLoadingOptions(true);
            getFieldOptions(field.id)
                .then(res => setCurrentOptions(res.data))
                .finally(() => setLoadingOptions(false));
        }
    };

    const handleCreateOption = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOptionValue.trim() || !editingField) return;
        try {
            const res = await createFieldOption({ fieldId: editingField.id, value: newOptionValue, color: newOptionColor });
            setCurrentOptions([...currentOptions, res.data.option]);
            setNewOptionValue('');
        } catch (error: any) { alert('Error al crear la opción: ' + (error.response?.data?.message || 'Error desconocido')); }
    };

    const handleDeleteOption = async (optionId: string) => {
        if (window.confirm("¿Seguro que quieres eliminar esta opción?")) {
            try {
                await deleteFieldOption(optionId);
                setCurrentOptions(currentOptions.filter(opt => opt.id !== optionId));
            } catch (error: any) { alert('Error al eliminar la opción.'); }
        }
    };
    
    // --- LÓGICA DE EDICIÓN DE OPCIONES ---
    const handleStartEditOption = (option: FieldOption) => {
        setEditingOptionId(option.id);
        setEditingOptionValue(option.value);
        setEditingOptionColor(option.color);
    };

    const handleCancelEditOption = () => {
        setEditingOptionId(null);
    };

    const handleSaveEditOption = async (optionId: string) => {
        if (!editingOptionValue.trim()) {
            alert("El nombre de la opción no puede estar vacío.");
            return;
        }
        try {
            const res = await updateFieldOption({ optionId, value: editingOptionValue, color: editingOptionColor });
            setCurrentOptions(currentOptions.map(opt => opt.id === optionId ? res.data.option : opt));
        } catch(error: any) {
            alert("Error al actualizar la opción: " + (error.response?.data?.message || 'Error desconocido'));
        } finally {
            setEditingOptionId(null);
        }
    };

    const handleDragEnd = (result: any) => {
        if (!result.destination) return;
        const items = Array.from(currentOptions);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setCurrentOptions(items);
        const optionIdsInNewOrder = items.map(item => item.id);
        updateFieldOptionsOrder(optionIdsInNewOrder).catch(err => {
            alert("No se pudo guardar el nuevo orden.");
        });
    };

    if (loading) return <p className="text-gray-500 p-6">Cargando...</p>;
    
    return (
        <div className="bg-white shadow-md rounded-lg p-6">
            <FieldEditModal isOpen={isFieldModalOpen} onClose={() => setIsFieldModalOpen(false)} onSave={handleSaveField} fieldToEdit={editingFieldData} />
            <div className="mb-6"><label htmlFor="workspace-select" className="block text-sm font-medium text-gray-700">Gestionar campos para el espacio de trabajo:</label><select id="workspace-select" value={selectedWorkspace} onChange={e => setSelectedWorkspace(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 border rounded-md"><option value="" disabled>Selecciona un espacio...</option>{workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}</select></div>
            <form onSubmit={handleCreateField} className="flex items-end gap-4 mb-6 p-4 bg-gray-50 rounded-lg border"><div><label className="block text-sm font-medium">Nombre del Campo</label><input type="text" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} className="w-full p-2 border rounded mt-1" placeholder="Ej: Encargado"/></div><div><label className="block text-sm font-medium">Tipo de Campo</label><select value={newFieldType} onChange={e => setNewFieldType(e.target.value)} className="w-full p-2 border rounded mt-1"><option value="text">Texto</option><option value="dropdown">Lista desplegable</option><option value="labels">Etiquetas</option><option value="files">Archivos</option></select></div><button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 h-10">Añadir Campo</button></form>
            <h3 className="text-lg font-semibold mb-2 border-t pt-6">Campos Existentes</h3>
            {loadingFields ? <p>Cargando campos...</p> : (<div className="divide-y divide-gray-200">{customFields.length > 0 ? customFields.map(field => (<div key={field.id} className="py-4"><div className="flex justify-between items-center"><div><span className="font-medium text-gray-800">{field.name}</span><span className="ml-4 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full font-mono">{field.type}</span></div><div className="space-x-4">{(field.type === 'dropdown' || field.type === 'labels') && (<button onClick={() => handleSelectFieldToEdit(field)} className="text-sm text-blue-600 hover:underline font-semibold">Opciones</button>)}<button onClick={() => handleOpenFieldModal(field)} className="text-sm text-green-600 hover:underline font-semibold">Editar</button><button onClick={() => handleDeleteField(field.id, field.name)} className="text-sm text-red-600 hover:underline font-semibold">Eliminar</button></div></div>{editingField?.id === field.id && (<div className="mt-4 pl-4 border-l-2 border-blue-200">{loadingOptions ? <p>Cargando opciones...</p> : (<><DragDropContext onDragEnd={handleDragEnd}><Droppable droppableId="options">{(provided) => (<div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 mb-4">{currentOptions.map((opt, index) => (<Draggable key={opt.id} draggableId={opt.id} index={index}>{(provided) => (<div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="flex items-center justify-between bg-gray-50 p-2 rounded-md"> {editingOptionId === opt.id ? (<div className="flex items-center gap-2 w-full"><input type="color" value={editingOptionColor} onChange={e => setEditingOptionColor(e.target.value)} className="h-8 w-8 p-1 rounded border"/><input type="text" value={editingOptionValue} onChange={e => setEditingOptionValue(e.target.value)} className="flex-grow p-1 border rounded"/><button onClick={() => handleSaveEditOption(opt.id)} className="px-2 py-1 bg-green-500 text-white text-xs rounded">Guardar</button><button onClick={handleCancelEditOption} className="px-2 py-1 bg-gray-400 text-white text-xs rounded">Cancelar</button></div>) : (<><div className="flex items-center"> <span style={{ backgroundColor: opt.color }} className="w-4 h-4 rounded-full mr-3 border"></span> <span>{opt.value}</span> </div> <div className="space-x-3"><button onClick={() => handleStartEditOption(opt)} className="text-sm text-gray-500 hover:text-blue-600">Editar</button><button onClick={() => handleDeleteOption(opt.id)} className="text-red-500 text-xl hover:text-red-700 leading-none">&times;</button></div></>)}</div>)}</Draggable>))}{provided.placeholder}</div>)}</Droppable></DragDropContext><form onSubmit={handleCreateOption} className="flex items-end gap-2 pt-4 border-t"><input type="color" value={newOptionColor} onChange={e => setNewOptionColor(e.target.value)} className="h-10 w-10 p-1 rounded-md border"/><input type="text" value={newOptionValue} onChange={e => setNewOptionValue(e.target.value)} placeholder="Nueva opción..." className="flex-grow p-2 border rounded-md"/><button type="submit" className="px-3 py-2 bg-gray-700 text-white text-sm font-semibold rounded-md hover:bg-gray-800">Añadir</button></form></>)}</div>)}</div>)) : <p className="text-sm text-gray-500">No hay campos personalizados para este espacio.</p>}</div>)}
        </div>
    );
};
export default CustomFieldManagement;