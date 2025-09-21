// client/src/components/TaskRow.tsx
import React, { useState, useRef, useEffect } from 'react';
import type { Task, CustomField, FieldOption, NestedTask, User } from '../types';
import Avatar from './ui/Avatar.tsx';
import Tag from './ui/Tag.tsx';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Cell } from '@tanstack/react-table';

const useClickOutside = (ref: React.RefObject<any>, handler: () => void) => {
    useEffect(() => {
        const listener = (event: MouseEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) return;
            handler();
        };
        document.addEventListener('mousedown', listener);
        return () => document.removeEventListener('mousedown', listener);
    }, [ref, handler]);
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
        if (fieldId === 'dueDate') { return task.dueDate ? new Date(task.dueDate.replace(/-/g, '/')).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : <span className="text-gray-400">-</span>; }
        if (fieldId === 'assignees') { return <div className="flex -space-x-2">{task.assignees?.length > 0 ? task.assignees.map(a => <Avatar key={a.id} name={a.name} />) : <Avatar />}</div> }
        
        const val = task.customFields?.[fieldId];
        const field = customFields.find(f => f.id === fieldId);
        if (!field || !val) return <span className="text-gray-400">-</span>;
        
        // --- CORRECCIÓN DEFINITIVA: Se usa un `if` explícito ---
        if (field.type === 'labels' && val.optionIds && val.optionIds.length > 0) {
            return <div className="flex flex-wrap gap-1">{val.optionIds.map(id => {const opt = fieldOptions[field.id]?.find(o=>o.id===id); return opt ? <Tag key={id} text={opt.value} color={opt.color} /> : null })}</div>;
        }
        if (field.type === 'dropdown' && val.optionId) { const opt = fieldOptions[field.id]?.find(o=>o.id===val.optionId); return opt ? <Tag text={opt.value} color={opt.color}/> : <span className="text-gray-400">-</span>; }
        return <div className="max-w-[150px] truncate" title={val.value}>{val.value || <span className="text-gray-400">-</span>}</div>;
    };

    const renderCellEditor = (cell: Cell<NestedTask, unknown>) => {
        const fieldId = cell.column.id;
        if (fieldId === 'dueDate') { return <DatePicker selected={task.dueDate ? new Date(task.dueDate.replace(/-/g, '/')) : null} onChange={(date) => { handleTaskUpdate({ dueDate: date ? date.toISOString().split('T')[0] : null }); setEditingCell(null); }} inline />; }
        if (fieldId === 'assignees') { return <ul className="py-1 w-56">{allUsers.map(user => { const isAssigned = task.assignees.some(a => a.id === user.id); return <li key={user.id} onClick={() => { const newAssignees = task.assignees.some(a => a.id === user.id) ? task.assignees.filter(a => a.id !== user.id) : [...task.assignees, {id: user.id, name: user.name}]; handleTaskUpdate({ assignees: newAssignees }); }} className="px-3 py-2 hover:bg-background-secondary flex items-center justify-between cursor-pointer"> <div className="flex items-center"><Avatar name={user.name} /><span className="ml-2 text-sm">{user.name}</span></div> <div className={`w-3 h-3 rounded-full ${isAssigned ? 'bg-green-500' : 'bg-red-500'}`} /> </li>; })}</ul>; }
        
        const field = customFields.find(f => f.id === fieldId);
        if(field && (field.type === 'labels' || field.type === 'dropdown')) {
            return <ul className="py-1 w-56">{(fieldOptions[field.id] || []).map(opt => {
                const existingValue = task.customFields?.[field.id] || { value: null, valueId: '', optionIds: [] };
                const isSelected = field.type === 'labels' ? existingValue.optionIds?.includes(opt.id) : existingValue.optionId === opt.id;
                return <li key={opt.id} onClick={() => {
                    let cfVal;
                    if (field.type === 'labels') {
                        const ids = existingValue.optionIds || [];
                        const newIds = ids.includes(opt.id) ? ids.filter((i: string) => i !== opt.id) : [...ids, opt.id];
                        cfVal = { ...existingValue, optionIds: newIds };
                    } else {
                        cfVal = { ...existingValue, optionId: opt.id, value: opt.value };
                        setEditingCell(null);
                    }
                    handleTaskUpdate({ customFields: { ...task.customFields, [field.id]: cfVal } });
                }} className="px-3 py-2 hover:bg-background-secondary flex items-center justify-between cursor-pointer"> <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-green-500' : 'bg-red-500'}`} /><Tag text={opt.value} color={opt.color} /></div> {field.type==='labels' && <input type="checkbox" readOnly checked={!!isSelected}/>} </li>;
            })}</ul>;
        }
        return null;
    };

    return (
        <>
            <div className="grid items-center border-b border-border hover:bg-background-secondary group" style={{ gridTemplateColumns }}>
                {cells.map(cell => (
                    <div key={cell.id} className="px-6 py-2 relative flex items-center h-full">
                        <div className="cursor-pointer w-full" onClick={() => {
                            if (cell.column.id !== 'title') { setEditingCell(cell.column.id); } 
                            else { onOpenTask(task, task.listId); }
                        }}>
                            {renderCellContent(cell)}
                        </div>
                        {editingCell === cell.column.id && (
                            <EditorPopup onClose={() => setEditingCell(null)}>
                                {renderCellEditor(cell)}
                            </EditorPopup>
                        )}
                    </div>
                ))}
            </div>
            {isExpanded && task.children.map(childTask => (
                <TaskRow key={childTask.id} task={childTask} gridTemplateColumns={gridTemplateColumns} cells={cells} customFields={customFields} fieldOptions={fieldOptions} onOpenTask={onOpenTask} onTaskUpdate={onTaskUpdate} level={level + 1} allUsers={allUsers} />
            ))}
        </>
    );
};

export default TaskRow;