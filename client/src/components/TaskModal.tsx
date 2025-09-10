// src/components/TaskModal.tsx

import React, { useState, useEffect, useRef } from 'react';
// --- AÑADIMOS API_URL A LA IMPORTACIÓN ---
import { createTask, updateTask, getAttachments, uploadAttachment, deleteAttachment, getFieldOptions, API_URL } from '../services/api';
import type { Task, CustomField, User, FieldOption } from '../types';
import RichTextEditor from './RichTextEditor.tsx';
import CommentSection from './CommentSection.tsx';
import TaskDependencies from './TaskDependencies.tsx';

interface Attachment { id: string; fileName: string; filePath: string; }
interface TaskModalProps {
    isOpen: boolean; onClose: () => void; listId: string | null | undefined; taskToEdit: Task | null;
    onTaskCreated: (newTask: Task) => void; onDataNeedsRefresh: () => void; customFields: CustomField[]; 
    parentId?: string; workspaceMembers: User[]; allWorkspaceTasks: Task[];
}

const MultiSelectDropdown: React.FC<{ options: FieldOption[]; selectedIds: string[]; onChange: (selectedIds: string[]) => void;}> = ({ options, selectedIds, onChange }) => {
    // ... (el código de este sub-componente no cambia)
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) { setIsOpen(false); } };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);
    const handleSelect = (optionId: string) => {
        const newSelectedIds = selectedIds.includes(optionId) ? selectedIds.filter(id => id !== optionId) : [...selectedIds, optionId];
        onChange(newSelectedIds);
    };
    const selectedOptions = options.filter(opt => selectedIds.includes(opt.id));
    return ( <div className="relative" ref={dropdownRef}> <div onClick={() => setIsOpen(!isOpen)} className="w-full p-2 border rounded bg-white cursor-pointer min-h-[42px] flex flex-wrap gap-1 items-center"> {selectedOptions.length > 0 ? selectedOptions.map(opt => ( <span key={opt.id} style={{ backgroundColor: opt.color + '30', color: opt.color }} className="px-2 py-1 text-xs font-bold rounded"> {opt.value} </span> )) : <span className="text-gray-400">-- Sin seleccionar --</span>} </div> {isOpen && ( <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto"> {options.map(opt => ( <div key={opt.id} onClick={() => handleSelect(opt.id)} className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"> <input type="checkbox" readOnly checked={selectedIds.includes(opt.id)} className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/> <span style={{ backgroundColor: opt.color + '30', color: opt.color }} className="px-2 py-1 text-xs font-bold rounded"> {opt.value} </span> </div> ))} </div> )} </div> );
};

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, listId, taskToEdit, onTaskCreated, onDataNeedsRefresh, customFields, parentId, workspaceMembers, allWorkspaceTasks }) => {
    
    // El resto del código que te di en la respuesta anterior es correcto y no necesita cambios.
    // Solo era necesario añadir la importación de API_URL.
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
    const [customFieldValues, setCustomFieldValues] = useState<{ [key: string]: any }>({});
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fieldOptions, setFieldOptions] = useState<{ [fieldId: string]: FieldOption[] }>({});
    const isEditMode = taskToEdit !== null;
    useEffect(() => {
        if (isOpen) {
            setError(''); setAttachments([]);
            if (isEditMode && taskToEdit) {
                setTitle(taskToEdit.title); 
                setDescription(taskToEdit.description || '');
                setDueDate(taskToEdit.dueDate ? taskToEdit.dueDate.split(' ')[0] : '');
                setAssigneeIds(taskToEdit.assignees ? taskToEdit.assignees.map(a => a.id) : []);
                setCustomFieldValues(taskToEdit.customFields || {});
                getAttachments(taskToEdit.id).then(res => setAttachments(res.data));
            } else {
                setTitle(''); setDescription(''); setDueDate(''); setAssigneeIds([]); setCustomFieldValues({});
            }
            const optionsToFetch = customFields.filter(f => f.type === 'dropdown' || f.type === 'labels');
            if (optionsToFetch.length > 0) {
                Promise.all(optionsToFetch.map(field => getFieldOptions(field.id))).then(results => {
                    const optionsMap: { [fieldId: string]: FieldOption[] } = {};
                    optionsToFetch.forEach((field, index) => { optionsMap[field.id] = results[index].data; });
                    setFieldOptions(optionsMap);
                    // --- NUEVA LÓGICA PARA ESTADO POR DEFECTO ---
                    // Si NO estamos en modo edición (es una tarea nueva)
                    if (!taskToEdit) {
                        const statusField = customFields.find(f => f.name.toLowerCase() === 'estado');
                        if (statusField) {
                            const statusOptions = optionsMap[statusField.id] || [];
                            if (statusOptions.length > 0) {
                                const defaultOption = statusOptions[0]; // Tomamos la primera opción
                                // Pre-populamos el estado de los campos personalizados
                                setCustomFieldValues(prev => ({
                                    ...prev,
                                    [statusField.id]: {
                                        optionId: defaultOption.id,
                                        value: defaultOption.value
                                    }
                                }));
                            }
                        }
                    }
                });
            } else { setFieldOptions({}); }
            
            // Lógica para rellenar el formulario en modo edición (sin cambios)
            if (isEditMode && taskToEdit) {
                // ...
            } else { // Limpiar formulario para tarea nueva
                setTitle(''); setDescription(''); setDueDate(''); setAssigneeIds([]);
                // Limpiamos los campos, pero la lógica de arriba ya habrá puesto el estado por defecto
                setCustomFieldValues(prev => prev || {}); 
            }
        }
    }, [isOpen, taskToEdit, isEditMode, customFields]);
    // Este NUEVO useEffect se encarga de poner el ESTADO POR DEFECTO.
    // Se ejecuta solo cuando las 'fieldOptions' cambian.
    useEffect(() => {
        // Solo aplica si es una tarea nueva Y ya tenemos las opciones cargadas
        if (isOpen && !isEditMode && Object.keys(fieldOptions).length > 0) {
            const statusField = customFields.find(f => f.name.toLowerCase() === 'estado');
            if (statusField) {
                const statusOptions = fieldOptions[statusField.id] || [];
                // Solo si no hay ya un valor para el estado y hay opciones disponibles
                if (statusOptions.length > 0 && !customFieldValues[statusField.id]) {
                    const defaultOption = statusOptions[0]; // Tomamos la primera opción
                    setCustomFieldValues(prev => ({
                        ...prev,
                        [statusField.id]: {
                            optionId: defaultOption.id,
                            value: defaultOption.value
                        }
                    }));
                }
            }
        }
    }, [fieldOptions, isOpen, isEditMode, customFields]);
    const handleDependencyUpdate = () => { onDataNeedsRefresh(); alert("Dependencia guardada. La verás reflejada al refrescar o reabrir la tarea."); };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) { setError("El título es requerido."); return; }
        setIsSubmitting(true); setError('');
        const cfPayload = Object.entries(customFieldValues).map(([fieldId, data]) => ({
            fieldId, value: data.value, optionId: data.optionId,
            optionIds: data.optionIds, type: customFields.find(f => f.id === fieldId)?.type, valueId: data.valueId
        }));
        try {
            if (isEditMode && taskToEdit) {
                const taskData = { taskId: taskToEdit.id, title, description, dueDate: dueDate || null, assigneeIds, customFields: cfPayload };
                await updateTask(taskData);
                onDataNeedsRefresh(); 
            } else {
                if (!listId) { setError("No se ha especificado una lista."); setIsSubmitting(false); return; }
                const taskData = { title, description, dueDate: dueDate || null, listId, parentId, assigneeIds, customFields: cfPayload };
                const res = await createTask(taskData);
                // La prop onTaskCreated espera un argumento, así que nos aseguramos que res.data.task exista.
                if (res.data.task) {
                    onTaskCreated(res.data.task); 
                } else {
                    onDataNeedsRefresh(); // Si no, solo refrescamos.
                }
            }
            onClose();
        } catch (err: any) { setError(err.response?.data?.message || "Ocurrió un error."); } 
        finally { setIsSubmitting(false); }
    };
    const handleCustomFieldChange = (fieldId: string, value: any, optionId: string | null = null, isMultiSelect = false, multiSelectIds: string[] = []) => {
        const currentField = customFieldValues[fieldId] || {};
        let newValues;
        if (isMultiSelect) { newValues = { ...currentField, optionIds: multiSelectIds }; } 
        else { newValues = { ...currentField, value, optionId }; }
        setCustomFieldValues(prev => ({ ...prev, [fieldId]: newValues }));
    };
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0] && taskToEdit) {
            const file = event.target.files[0]; setIsUploading(true);
            try {
                const res = await uploadAttachment(taskToEdit.id, file);
                setAttachments(prev => [...prev, res.data.attachment]);
            } catch (error) { alert('Error al subir el archivo.'); } 
            finally { setIsUploading(false); event.target.value = ''; }
        } else if (!isEditMode) {
            alert("Debes guardar la tarea por primera vez antes de poder adjuntar archivos.");
        }
    };
    const handleDeleteAttachment = async (attachmentId: string) => {
        if (window.confirm("¿Seguro que quieres eliminar este archivo?")) {
            try {
                await deleteAttachment(attachmentId);
                setAttachments(prev => prev.filter(att => att.id !== attachmentId));
            } catch (error) { alert('Error al eliminar el archivo.'); }
        }
    };
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre de la tarea" className="w-full text-2xl font-bold outline-none" autoFocus />
                        <button type="button" onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-800 ml-4">&times;</button>
                    </div>
                    <div className="p-6 flex-grow overflow-y-auto space-y-6">
                        <label className="block text-sm font-medium text-gray-700">Descripción</label>
                        <RichTextEditor content={description} onChange={setDescription} placeholder="Añade una descripción..." />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div> <label className="block text-sm font-medium text-gray-700">Fecha Límite</label> <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 p-2 border rounded w-full" /> </div>
                            <div> <label className="block text-sm font-medium text-gray-700">Personas Asignadas</label> <MultiSelectDropdown options={workspaceMembers.map(m => ({ id: m.id, value: m.name, color: '#e5e7eb' }))} selectedIds={assigneeIds} onChange={setAssigneeIds} /> </div>
                        </div>
                        {customFields.map(field => {
                            const currentValue = customFieldValues[field.id] || {};
                            if (field.type === 'text') {
                                return (<div key={field.id}><label className="block text-sm font-medium text-gray-700">{field.name}</label><input type="text" value={currentValue.value || ''} onChange={(e) => handleCustomFieldChange(field.id, e.target.value, null)} className="mt-1 p-2 border rounded w-full" /></div>);
                            }
                            if (field.type === 'dropdown') {
                                return (<div key={field.id}><label className="block text-sm font-medium text-gray-700">{field.name}</label><select value={currentValue.optionId || ''} onChange={(e) => handleCustomFieldChange(field.id, e.target.options[e.target.selectedIndex].text, e.target.value)} className="mt-1 p-2 border rounded w-full bg-white">{(fieldOptions[field.id] || []).map(opt => (<option key={opt.id} value={opt.id}>{opt.value}</option>))}</select></div>);
                            }
                            if (field.type === 'labels') {
                                return (<div key={field.id}><label className="block text-sm font-medium text-gray-700">{field.name}</label><MultiSelectDropdown options={fieldOptions[field.id] || []} selectedIds={currentValue.optionIds || []} onChange={(selectedIds) => handleCustomFieldChange(field.id, null, null, true, selectedIds)} /></div>);
                            }
                            return null;
                        })}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Archivos Adjuntos</label>
                            <div className="mt-2 space-y-2">
                                {attachments.map(att => (
                                    <div key={att.id} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                                        {/* La variable API_URL ahora está disponible aquí */}
                                        <a href={`${API_URL}/${att.filePath}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{att.fileName}</a>
                                        <button onClick={() => handleDeleteAttachment(att.id)} type="button" className="text-red-500 text-xl">&times;</button>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-2">
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} disabled={!isEditMode || isUploading} />
                                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!isEditMode || isUploading} className={`text-sm font-semibold text-blue-600 hover:text-blue-800 ${!isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {isUploading ? 'Subiendo...' : '+ Añadir archivo'}
                                </button>
                                {!isEditMode && <p className="text-xs text-gray-500">Guarda la tarea para poder adjuntar archivos.</p>}
                            </div>
                        </div>
                        {isEditMode && taskToEdit && <TaskDependencies task={taskToEdit} allTasks={allWorkspaceTasks} onUpdate={handleDependencyUpdate} />}
                        {isEditMode && taskToEdit && <CommentSection taskId={taskToEdit.id} />}
                        {error && <p className="text-red-500 mt-4">{error}</p>}
                    </div>
                    <div className="p-4 border-t bg-gray-50 flex justify-end flex-shrink-0">
                        <button type="button" onClick={onClose} className="mr-2 px-4 py-2 bg-gray-200 rounded" disabled={isSubmitting}>Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : (isEditMode ? 'Guardar Cambios' : 'Crear Tarea')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaskModal;