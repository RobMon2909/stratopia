// src/components/TaskModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { createTask, updateTask, getAttachments, uploadAttachment, deleteAttachment, getFieldOptions } from '../services/api.ts';
import type { Task, CustomField, User } from '../types';
import RichTextEditor from './RichTextEditor.tsx'; // Importamos el editor
import CommentSection from './CommentSection.tsx'; // Importamos la sección de comentarios

// --- Tipos y Sub-Componente MultiSelect (sin cambios) ---
interface Attachment { id: string; fileName: string; filePath: string; }
interface FieldOption { id: string; value: string; color: string; }
interface TaskModalProps {
    isOpen: boolean; onClose: () => void; listId: string | null | undefined; taskToEdit: Task | null;
    onTaskCreated: (newTask: Task) => void; onTaskUpdated: (updatedTask: any) => void;
    customFields: CustomField[]; parentId?: string; workspaceMembers: User[];
}
const MultiSelectDropdown: React.FC<{ options: FieldOption[]; selectedIds: string[]; onChange: (selectedIds: string[]) => void;}> = ({ options, selectedIds, onChange }) => {
    // ... (código del multiselect sin cambios)
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


// --- Componente Principal del Modal ---
const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, listId, taskToEdit, onTaskCreated, onTaskUpdated, customFields, parentId, workspaceMembers }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState(''); // Este estado ahora manejará HTML
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
                setDescription(taskToEdit.description || ''); // El contenido puede ser HTML
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
                });
            } else { setFieldOptions({}); }
        }
    }, [isOpen, taskToEdit, isEditMode, customFields]);
    
    // ... (handleCustomFieldChange sin cambios)
    const handleCustomFieldChange = (fieldId: string, value: any, optionId: string | null = null, isMultiSelect = false, multiSelectIds: string[] = []) => {
        const currentField = customFieldValues[fieldId] || {};
        let newValues;
        if (isMultiSelect) { newValues = { ...currentField, optionIds: multiSelectIds }; } 
        else { newValues = { ...currentField, value, optionId }; }
        setCustomFieldValues(prev => ({ ...prev, [fieldId]: newValues }));
    };

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
                const res = await updateTask(taskData);
                onTaskUpdated(res.data.task);
            } else {
                if (!listId) { setError("No se ha especificado una lista."); setIsSubmitting(false); return; }
                const taskData = { title, description, dueDate: dueDate || null, listId, parentId, assigneeIds, customFields: cfPayload };
                const res = await createTask(taskData);
                onTaskCreated(res.data.task);
            }
            onClose();
        } catch (err: any) { setError(err.response?.data?.message || "Ocurrió un error."); } 
        finally { setIsSubmitting(false); }
    };
    
    // ... (lógica de archivos adjuntos sin cambios)
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0] && taskToEdit) {
            const file = event.target.files[0]; setIsUploading(true);
            try { const res = await uploadAttachment(taskToEdit.id, file); setAttachments(prev => [...prev, res.data.attachment]); } catch (error) { alert('Error al subir el archivo.'); } 
            finally { setIsUploading(false); }
        } else if (!isEditMode) { alert("Debes guardar la tarea por primera vez antes de poder adjuntar archivos."); }
    };
    const handleDeleteAttachment = async (attachmentId: string) => {
        if (window.confirm("¿Seguro que quieres eliminar este archivo?")) {
            try { await deleteAttachment(attachmentId); setAttachments(prev => prev.filter(att => att.id !== attachmentId)); } catch (error) { alert('Error al eliminar el archivo.'); }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-4 border-b flex justify-between items-center flex-shrink-0"> <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre de la tarea" className="w-full text-2xl font-bold outline-none" autoFocus /> <button type="button" onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-800 ml-4">&times;</button> </div>
                    <div className="p-6 flex-grow overflow-y-auto space-y-6">
                        {/* --- CAMBIO: USAMOS EL NUEVO EDITOR PARA LA DESCRIPCIÓN --- */}
                        <label className="block text-sm font-medium text-gray-700">Descripción</label>
                        <RichTextEditor content={description} onChange={setDescription} placeholder="Añade una descripción..." />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div> <label className="block text-sm font-medium text-gray-700">Fecha Límite</label> <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 p-2 border rounded w-full" /> </div>
                            <div> <label className="block text-sm font-medium text-gray-700">Personas Asignadas</label> <MultiSelectDropdown options={workspaceMembers.map(m => ({ id: m.id, value: m.name, color: '#e5e7eb' }))} selectedIds={assigneeIds} onChange={setAssigneeIds} /> </div>
                        </div>
                        
                        {/* Campos personalizados (sin cambios) */}
                        {customFields.map(field => { const currentValue = customFieldValues[field.id] || {}; if (field.type === 'text') { return (<div key={field.id}> <label className="block text-sm font-medium text-gray-700">{field.name}</label> <input type="text" value={currentValue.value || ''} onChange={(e) => handleCustomFieldChange(field.id, e.target.value, null)} className="mt-1 p-2 border rounded w-full" /> </div>); } if (field.type === 'dropdown') { return (<div key={field.id}> <label className="block text-sm font-medium text-gray-700">{field.name}</label> <select value={currentValue.optionId || ''} onChange={(e) => handleCustomFieldChange(field.id, e.target.options[e.target.selectedIndex].text, e.target.value)} className="mt-1 p-2 border rounded w-full bg-white"> <option value="">-- Sin seleccionar --</option> {(fieldOptions[field.id] || []).map(opt => (<option key={opt.id} value={opt.id}>{opt.value}</option>))} </select> </div>); } if (field.type === 'labels') { return (<div key={field.id}> <label className="block text-sm font-medium text-gray-700">{field.name}</label> <MultiSelectDropdown options={fieldOptions[field.id] || []} selectedIds={currentValue.optionIds || []} onChange={(selectedIds) => handleCustomFieldChange(field.id, null, null, true, selectedIds)} /> </div>); } return null; })}
                        
                        {/* Archivos adjuntos (sin cambios) */}
                        <div> <label className="block text-sm font-medium text-gray-700">Archivos Adjuntos</label> <div className="mt-2 space-y-2"> {attachments.map(att => ( <div key={att.id} className="flex justify-between items-center bg-gray-100 p-2 rounded"> <a href={`http://localhost:5000/${att.filePath}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{att.fileName}</a> <button onClick={() => handleDeleteAttachment(att.id)} type="button" className="text-red-500 text-xl">&times;</button> </div> ))} </div> <div className="mt-2"> <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} disabled={!isEditMode || isUploading} /> <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!isEditMode || isUploading} className={`text-sm font-semibold text-blue-600 hover:text-blue-800 ${!isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}> {isUploading ? 'Subiendo...' : '+ Añadir archivo'} </button> {!isEditMode && <p className="text-xs text-gray-500">Guarda la tarea para poder adjuntar archivos.</p>} </div> </div>
                        
                        {/* SECCIÓN DE COMENTARIOS */}
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