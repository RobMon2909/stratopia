// src/components/TaskModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { createTask, updateTask, getAttachments, uploadAttachment, deleteAttachment, getFieldOptions } from '../services/api';
import type { Task, CustomField, User, FieldOption, } from '../types';
import RichTextEditor from './RichTextEditor.tsx';
import CommentSection from './CommentSection.tsx';
import TaskDependencies from './TaskDependencies.tsx';

interface TaskModalProps {
    isOpen: boolean; 
    onClose: () => void; 
    listId: string | null | undefined; 
    taskToEdit: Task | null;
    onTaskCreated: (newTask: Task) => void; 
    onDataNeedsRefresh: () => void;
    customFields: CustomField[]; 
    parentId?: string; 
    workspaceMembers: User[];
    allWorkspaceTasks: Task[];
}

const MultiSelectDropdown: React.FC<{ options: FieldOption[]; selectedIds: string[]; onChange: (selectedIds: string[]) => void;}> = ({ options, selectedIds, onChange }) => {
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


const TaskModal: React.FC<TaskModalProps> = ({ 
    isOpen, onClose, listId, taskToEdit, onTaskCreated, onDataNeedsRefresh,
    customFields, parentId, workspaceMembers, allWorkspaceTasks 
}) => {
    
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
                });
            } else { setFieldOptions({}); }
        }
    }, [isOpen, taskToEdit, isEditMode, customFields]);
    
    const handleDependencyUpdate = () => {
        onDataNeedsRefresh();
        alert("Dependencia guardada. La verás reflejada al refrescar o reabrir la tarea.");
    };

    // --- LÓGICA DE handleSubmit CORREGIDA ---
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
                // Después de actualizar, llamamos a onDataNeedsRefresh SIN ARGUMENTOS
                onDataNeedsRefresh(); 
            } else {
                if (!listId) { setError("No se ha especificado una lista."); setIsSubmitting(false); return; }
                const taskData = { title, description, dueDate: dueDate || null, listId, parentId, assigneeIds, customFields: cfPayload };
                const res = await createTask(taskData);
                // Después de crear, llamamos a onTaskCreated CON EL ARGUMENTO de la nueva tarea
                onTaskCreated(res.data.task); 
            }
            onClose();
        } catch (err: any) { 
            setError(err.response?.data?.message || "Ocurrió un error."); 
        } finally { 
            setIsSubmitting(false); 
        }
    };
    
    // (El resto de las funciones como handleFileSelect, etc. no cambian)
    const handleCustomFieldChange = (fieldId: string, value: any, optionId: string | null = null, isMultiSelect = false, multiSelectIds: string[] = []) => { /* ... */ };
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => { /* ... */ };
    const handleDeleteAttachment = async (attachmentId: string) => { /* ... */ };

    if (!isOpen) return null;

    return (
        // El JSX del modal no cambia, solo la lógica interna que hemos corregido
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    {/* ... (Todo tu JSX existente para el header, body y footer del modal) ... */}
                </form>
            </div>
        </div>
    );
};

export default TaskModal;