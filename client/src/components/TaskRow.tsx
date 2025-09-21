// client/src/components/TaskRow.tsx
import React, { useState, useRef, useEffect } from 'react';
import type { Task, CustomField, FieldOption, NestedTask, User } from '../types';
import Avatar from './ui/Avatar.tsx';
import Tag from './ui/Tag.tsx';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Cell } from '@tanstack/react-table';
import { FaAlignLeft } from 'react-icons/fa';

const useClickOutside = (ref: React.RefObject<any>, handler: () => void) => {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) return;
            handler();
        };
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
};

interface DescriptionEditorProps {
    content: string | null | undefined;
    onSave: (newContent: string) => void;
    onClose: () => void;
}
const DescriptionEditor: React.FC<DescriptionEditorProps> = ({ content, onSave, onClose }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const initialText = content === '<p></p>' ? '' : content || '';
    const [text, setText] = useState(initialText);

    useClickOutside(editorRef, onClose);

    const handleSave = () => {
        onSave(text);
        onClose();
    };

    return (
        // --- SOLUCIÓN: Editor más grande y con más margen superior ---
        <div className="absolute z-30 mt-2 p-3 bg-card border border-border rounded shadow-lg w-[450px]" ref={editorRef}>
            <h4 className="font-bold mb-2 text-sm">Editar Descripción</h4>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-48 p-2 border border-border-color rounded bg-background-primary text-foreground-primary text-sm"
                autoFocus
            />
            <div className="flex justify-end mt-2">
                <button 
                    onClick={handleSave}
                    className="px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700"
                >
                    Guardar
                </button>
            </div>
        </div>
    );
};

const EditorPopup: React.FC<{ children: React.ReactNode; onClose: () => void; }> = ({ children, onClose }) => {
    const popupRef = useRef<HTMLDivElement>(null);
    useClickOutside(popupRef, onClose);
    return (
        <div ref={popupRef} className="absolute z-20 mt-2 bg-card border border-border rounded shadow-lg max-h-60 overflow-y-auto">
            {children}
        </div>
    );
};

interface TaskRowProps {
    task: NestedTask;
    gridTemplateColumns: string;
    cells: Cell<NestedTask, unknown>[];
    customFields: CustomField[];
    fieldOptions: { [fieldId: string]: FieldOption[] };
    onOpenTask: (task: Task | null, listId: string, parentId?: string) => void;
    onTaskUpdate: (updatedTask: Partial<Task> & { id: string }) => void;
    level: number;
    allUsers: User[];
}

const TaskRow: React.FC<TaskRowProps> = ({ task, gridTemplateColumns, cells, customFields, fieldOptions, onOpenTask, onTaskUpdate, level, allUsers }) => {
    
    const [isExpanded, setIsExpanded] = useState(true);
    const [editingCell, setEditingCell] = useState<string | null>(null);
    const [isDescEditorOpen, setIsDescEditorOpen] = useState(false);

    const handleTaskUpdate = (data: Partial<Task>) => onTaskUpdate({ id: task.id, ...data });

    const renderCellContent = (cell: Cell<NestedTask, unknown>) => {
        const fieldId = cell.column.id;

        if (fieldId === 'title') {
            return <div style={{ paddingLeft: `${level * 24}px` }} className="flex items-center gap-2">
                        {task.children?.length > 0 ? (
                            <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="p-0.5 rounded-full hover:bg-gray-200">
                                <svg className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                            </button>
                        ) : <div className="w-5" />}
                        <span className="truncate max-w-xs">{task.title}</span>
                    </div>
        }
        if (fieldId === 'description') { return task.description && task.description !== '<p></p>' ? <FaAlignLeft className="text-gray-400" /> : <span className="text-gray-400">-</span>; }
        if (fieldId === 'dueDate') { return task.dueDate ? new Date(task.dueDate.replace(/-/g, '/')).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : <span className="text-gray-400">-</span>; }
        if (fieldId === 'assignees') { return <div className="flex -space-x-2">{task.assignees?.length > 0 ? task.assignees.map(a => <Avatar key={a.id} name={a.name} />) : <Avatar />}</div> }
        
        const val = task.customFields?.[fieldId];
        const field = customFields.find(f => f.id === fieldId);
        if (!field || val === undefined || val === null) return <span className="text-gray-400">-</span>;
        
        if (field.type === 'labels') {
            const optionIds = val.optionIds || [];
            if (optionIds.length === 0) return <span className="text-gray-400">-</span>;
            return <div className="flex flex-wrap gap-1">{optionIds.map(id => {const opt = fieldOptions[field.id]?.find(o=>o.id===id); return opt ? <Tag key={id} text={opt.value} color={opt.color} /> : null })}</div>;
        }
        if (field.type === 'dropdown') { 
            if (!val.optionId) return <span className="text-gray-400">-</span>;
            const opt = fieldOptions[field.id]?.find(o=>o.id===val.optionId); 
            return opt ? <Tag text={opt.value} color={opt.color}/> : <span className="text-gray-400">-</span>; 
        }

        return <div className="max-w-[150px] truncate" title={val.value}>{val.value || <span className="text-gray-400">-</span>}</div>;
    };

    const renderCellEditor = (cell: Cell<NestedTask, unknown>) => {
        const fieldId = cell.column.id;

        if (fieldId === 'dueDate') { 
            return (
                // --- SOLUCIÓN: Corrección del error de TS y posicionamiento con CSS ---
                <DatePicker 
                    selected={task.dueDate ? new Date(task.dueDate.replace(/-/g, '/')) : null} 
                    onChange={(date) => { 
                        handleTaskUpdate({ dueDate: date ? date.toISOString().split('T')[0] : null }); 
                        setEditingCell(null); 
                    }} 
                    popperPlacement="bottom-start"
                    inline
                    popperClassName="datepicker-popper-offset" // Clase CSS para bajar el pop-up
                />
            );
        }
        
        if (fieldId === 'assignees') {
             return (
                <ul className="py-1 w-56">
                    {allUsers.map(user => {
                        const currentAssignees = task.assignees || [];
                        const isAssigned = currentAssignees.some(a => a.id === user.id);
                        
                        return (
                            <li key={user.id} onClick={() => {
                                const newAssignees = isAssigned
                                    ? currentAssignees.filter(a => a.id !== user.id)
                                    : [...currentAssignees, { id: user.id, name: user.name }];
                                handleTaskUpdate({ assignees: newAssignees });
                            }} className="px-3 py-2 hover:bg-background-secondary flex items-center justify-between cursor-pointer">
                                <div className="flex items-center"><Avatar name={user.name} /><span className="ml-2 text-sm">{user.name}</span></div>
                                <div className={`w-3 h-3 rounded-full ${isAssigned ? 'bg-green-500' : 'bg-red-500'}`} />
                            </li>
                        );
                    })}
                </ul>
            );
        }
        
        const field = customFields.find(f => f.id === fieldId);
        if(field && (field.type === 'labels' || field.type === 'dropdown')) {
            return (
                <ul className="py-1 w-56">
                    {(fieldOptions[field.id] || []).map(opt => {
                        const existingValue = task.customFields?.[field.id] || { value: null, valueId: '', optionId: null, optionIds: [] };
                        const isSelected = field.type === 'labels' ? existingValue.optionIds?.includes(opt.id) : existingValue.optionId === opt.id;
                        
                        return (
                            <li key={opt.id} onClick={() => {
                                let cfVal;
                                if (field.type === 'labels') {
                                    const ids = existingValue.optionIds || [];
                                    const newIds = ids.includes(opt.id) ? ids.filter((i: string) => i !== opt.id) : [...ids, opt.id];
                                    cfVal = { ...existingValue, optionIds: newIds };
                                } else { 
                                    const newOptionId = isSelected ? null : opt.id;
                                    const newValue = isSelected ? null : opt.value;
                                    cfVal = { ...existingValue, optionId: newOptionId, value: newValue };
                                    setEditingCell(null);
                                }
                                handleTaskUpdate({ customFields: { [field.id]: cfVal } });
                            }} className="flex items-center justify-between cursor-pointer">
                                {/* --- SOLUCIÓN: Quitar checklist y puntos para dropdowns --- */}
                                <div className="px-3 py-2 hover:bg-background-secondary w-full flex items-center justify-between">
                                    <Tag text={opt.value} color={opt.color} />
                                    {field.type === 'labels' && (
                                         <input type="checkbox" readOnly checked={!!isSelected} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            );
        }
        return null;
    };

    return (
        <>
            <div className="grid items-center border-b border-border hover:bg-background-secondary group" style={{ gridTemplateColumns }}>
                {cells.map(cell => (
                    <div key={cell.id} className="px-6 py-2 relative flex items-center h-full">
                        <div className="cursor-pointer w-full h-full flex items-center" onClick={(e) => {
                            if (cell.column.id === 'description') {
                                e.stopPropagation();
                                setIsDescEditorOpen(true);
                            } else if (cell.column.id === 'title') { 
                                onOpenTask(task, task.listId);
                            } else { 
                                setEditingCell(cell.column.id); 
                            }
                        }}>
                            {renderCellContent(cell)}
                        </div>
                        {editingCell === cell.column.id && (
                            <EditorPopup onClose={() => setEditingCell(null)}>
                                {renderCellEditor(cell)}
                            </EditorPopup>
                        )}
                        {isDescEditorOpen && cell.column.id === 'description' && (
                            <DescriptionEditor 
                                content={task.description}
                                onClose={() => setIsDescEditorOpen(false)}
                                onSave={(newDescription) => {
                                    handleTaskUpdate({ description: newDescription });
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>
            {isExpanded && task.children.map(childTask => (
                <TaskRow
                    key={childTask.id}
                    task={childTask}
                    gridTemplateColumns={gridTemplateColumns}
                    cells={cells}
                    customFields={customFields}
                    fieldOptions={fieldOptions}
                    onOpenTask={onOpenTask}
                    onTaskUpdate={onTaskUpdate}
                    level={level + 1}
                    allUsers={allUsers}
                />
            ))}
        </>
    );
};

export default TaskRow;