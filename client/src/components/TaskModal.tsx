import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { createTask, updateTask, getAttachments, uploadAttachment, deleteAttachment, getFieldOptions, getComments, createComment, API_URL } from '../services/api';
import type { Task, CustomField, User, FieldOption } from '../types';
import RichTextEditor from './RichTextEditor';
import TaskDependencies from './TaskDependencies';
import { useEditor, EditorContent, ReactRenderer, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import tippy, { Instance as TippyInstance, GetReferenceClientRect } from 'tippy.js';
import 'tippy.js/dist/tippy.css';

interface Attachment { id: string; fileName: string; filePath: string; }
interface Comment { id: string; content: string; createdAt: string; userId: string; userName: string; }
interface TaskModalProps {
    isOpen: boolean; onClose: () => void; listId: string | null | undefined; taskToEdit: Task | null;
    onTaskCreated: (newTask: Task) => void; onDataNeedsRefresh: () => void; customFields: CustomField[]; 
    parentId?: string; workspaceMembers: User[]; allWorkspaceTasks: Task[];
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

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, listId, taskToEdit, onTaskCreated, onDataNeedsRefresh, customFields, parentId, workspaceMembers, allWorkspaceTasks }) => {
    
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
    const [customFieldValues, setCustomFieldValues] = useState<{ [key: string]: any }>({});
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fieldOptions, setFieldOptions] = useState<{ [fieldId: string]: FieldOption[] }>({});
    const isEditMode = taskToEdit !== null;

    useEffect(() => {
        if (isOpen) {
            setError(''); setAttachments([]); setComments([]);
            if (isEditMode && taskToEdit) {
                setTitle(taskToEdit.title); 
                setDescription(taskToEdit.description || '');
                setDueDate(taskToEdit.dueDate ? taskToEdit.dueDate.split(' ')[0] : '');
                setAssigneeIds(taskToEdit.assignees ? taskToEdit.assignees.map(a => a.id) : []);
                setCustomFieldValues(taskToEdit.customFields || {});
                getAttachments(taskToEdit.id).then(res => setAttachments(res.data));
                getComments(taskToEdit.id).then(res => setComments(res.data));
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

    useEffect(() => {
        if (isOpen && !isEditMode && Object.keys(fieldOptions).length > 0) {
            const statusField = customFields.find(f => f.name.toLowerCase() === 'estado');
            if (statusField) {
                const statusOptions = fieldOptions[statusField.id] || [];
                if (statusOptions.length > 0 && !customFieldValues[statusField.id]) {
                    const defaultOption = statusOptions[0];
                    setCustomFieldValues(prev => ({ ...prev, [statusField.id]: { optionId: defaultOption.id, value: defaultOption.value } }));
                }
            }
        }
    }, [fieldOptions, isOpen, isEditMode, customFields, customFieldValues]);

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
                if (res.data.task) { onTaskCreated(res.data.task); } else { onDataNeedsRefresh(); }
            }
            onClose();
        } catch (err: any) { setError(err.response?.data?.message || "Ocurrió un error."); } 
        finally { setIsSubmitting(false); }
    };

    const handleCustomFieldChange = (fieldId: string, value: any, optionId: string | null = null, isMultiSelect = false, multiSelectIds: string[] = []) => {
        const currentField = customFieldValues[fieldId] || {};
        const newValues = isMultiSelect ? { ...currentField, optionIds: multiSelectIds } : { ...currentField, value, optionId };
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
        } else if (!isEditMode) { alert("Debes guardar la tarea por primera vez para poder adjuntar archivos."); }
    };

    const handleDeleteAttachment = async (attachmentId: string) => {
        if (window.confirm("¿Seguro que quieres eliminar este archivo?")) {
            try {
                await deleteAttachment(attachmentId);
                setAttachments(prev => prev.filter(att => att.id !== attachmentId));
            } catch (error) { alert('Error al eliminar el archivo.'); }
        }
    };
    
    const handlePostComment = async (commentContent: string) => {
        const isCommentEmpty = !commentContent || commentContent.trim() === '' || commentContent.trim() === '<p></p>';
        if (!taskToEdit || isCommentEmpty) {
            return;
        }
        try {
            const res = await createComment({ taskId: taskToEdit.id, content: commentContent });
            setComments(prev => [...prev, res.data.comment]);
        } catch (error) {
            alert('No se pudo enviar el comentario.');
            console.error(error);
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
                        
                        {/* --- LÓGICA DE CAMPOS PERSONALIZADOS (AHORA INCLUYE PRIORIDAD) --- */}
                {customFields.map(field => {
                    const currentValue = customFieldValues[field.id] || {};
                    if (field.type === 'text') { return (<div key={field.id}> {/* ... */} </div>); }
                    if (field.type === 'dropdown') {
                        return (
                            <div key={field.id}>
                                <label className="block text-sm font-medium text-gray-700">{field.name}</label>
                                <select 
                                    value={currentValue.optionId || ''} 
                                    onChange={(e) => handleCustomFieldChange(field.id, e.target.options[e.target.selectedIndex].text, e.target.value)} 
                                    className="mt-1 p-2 border rounded w-full bg-white"
                                >
                                    {(fieldOptions[field.id] || []).map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.value}</option>
                                    ))}
                                </select>
                            </div>
                        );
                    }
                    if (field.type === 'labels') {
                                return (
                                    <div key={field.id}>
                                        <label className="block text-sm font-medium text-gray-700">{field.name}</label>
                                        {/* --- CORRECCIÓN CLAVE PARA ETIQUETAS --- */}
                                        {/* Nos aseguramos de pasar un array a selectedIds */}
                                        <MultiSelectDropdown 
                                            options={fieldOptions[field.id] || []} 
                                            selectedIds={currentValue.optionIds || []} 
                                            onChange={(selectedIds) => handleCustomFieldChange(field.id, null, null, true, selectedIds)} 
                                        />
                                    </div>
                                );
                            }
                            return null;
                        })}
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Archivos Adjuntos</label>
                            <div className="mt-2 space-y-2">
                                {attachments.map(att => (
                                    <div key={att.id} className="flex justify-between items-center bg-gray-100 p-2 rounded">
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
                        
                        {isEditMode && taskToEdit && (
                            <div className="mt-6 pt-4 border-t">
                                <h3 className="text-lg font-semibold mb-3">Comentarios</h3>
                                <div className="space-y-4 mb-4">
                                    {comments.map(comment => (
                                        <div key={comment.id} className="flex items-start space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{comment.userName.charAt(0)}</div>
                                            <div>
                                                <div className="bg-gray-100 rounded-lg p-3">
                                                    <p className="font-semibold text-sm">{comment.userName}</p>
                                                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: comment.content }} />
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">{new Date(comment.createdAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <CommentEditor members={workspaceMembers} onPost={handlePostComment} />
                            </div>
                        )}
                        
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

const CommentEditor: React.FC<{ members: User[]; onPost: (content: string) => void }> = ({ members, onPost }) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Mention.configure({
                HTMLAttributes: { class: 'mention' },
                suggestion: {
                    items: ({ query }) => {
                        return members.filter(member => 
                            member.name.toLowerCase().startsWith(query.toLowerCase())
                        ).slice(0, 5);
                    },
                    render: () => {
                        let component: ReactRenderer;
                        let popup: TippyInstance[];
                        return {
                            onStart: props => {
                                component = new ReactRenderer(MentionList, { props, editor: props.editor });
                                const getReferenceClientRect: GetReferenceClientRect = () => {
                                    const rect = props.clientRect ? props.clientRect() : null;
                                    return rect || new DOMRect(0, 0, 0, 0);
                                };
                                popup = tippy('body', {
                                    getReferenceClientRect,
                                    appendTo: () => document.body,
                                    content: component.element,
                                    showOnCreate: true,
                                    interactive: true,
                                    trigger: 'manual',
                                    placement: 'bottom-start',
                                });
                            },
                            onUpdate(props) {
                                component.updateProps(props);
                                const getReferenceClientRect: GetReferenceClientRect = () => {
                                    const rect = props.clientRect ? props.clientRect() : null;
                                    return rect || new DOMRect(0, 0, 0, 0);
                                };
                                if(popup && popup[0]) {
                                    popup[0].setProps({ getReferenceClientRect });
                                }
                            },
                            onKeyDown(props) {
                                if (props.event.key === 'Escape') { 
                                    if(popup && popup[0]) popup[0].hide(); 
                                    return true; 
                                }
                                return (component.ref as any)?.onKeyDown(props);
                            },
                            onExit() {
                                if (popup && popup[0] && !popup[0].state.isDestroyed) {
                                    popup[0].destroy();
                                }
                                if (component) {
                                    component.destroy();
                                }
                            },
                        };
                    },
                },
            }),
        ],
        editorProps: { attributes: { class: 'prose max-w-none p-3 min-h-[100px] border border-gray-300 rounded focus:outline-none' } },
    });

    const handlePostClick = () => {
        if (editor) {
            onPost(editor.getHTML());
            editor.commands.clearContent();
        }
    };

    return (
        <div>
            <EditorContent editor={editor} />
            <button type="button" onClick={handlePostClick} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold">
                Comentar
            </button>
        </div>
    );
};

const MentionList = forwardRef((props: any, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const selectItem = (index: number) => {
        if (index >= props.items.length) { return; }
        props.command({ id: props.items[index].id, label: props.items[index].name });
    };
    const upHandler = () => setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
    const downHandler = () => setSelectedIndex((selectedIndex + 1) % props.items.length);
    useEffect(() => setSelectedIndex(0), [props.items]);
    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') { upHandler(); return true; }
            if (event.key === 'ArrowDown') { downHandler(); return true; }
            if (event.key === 'Enter') { selectItem(selectedIndex); return true; }
            return false;
        },
    }));
    return (
        <div className="bg-white rounded-md shadow-lg border p-1">
            {props.items.length ? (
                props.items.map((item: User, index: number) => (
                    <button type="button" className={`block w-full text-left p-2 rounded-md ${index === selectedIndex ? 'bg-blue-100' : ''}`} key={index} onClick={() => selectItem(index)}>
                        {item.name}
                    </button>
                ))
            ) : (<div className="p-2">Sin resultados</div>)}
        </div>
    );
});

export default TaskModal;