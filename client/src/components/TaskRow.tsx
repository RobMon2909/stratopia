import React, { useState } from 'react'; // <-- Se añade useState
import type { Task, CustomField, FieldOption, NestedTask } from '../types';
import EditableCell from './EditableCell.tsx';
import Avatar from './ui/Avatar.tsx';
import Tag from './ui/Tag.tsx';

interface TaskRowProps {
    task: NestedTask;
    customFields: CustomField[];
    fieldOptions: { [fieldId: string]: FieldOption[] };
    onOpenTask: (task: Task | null, listId: string, parentId?: string) => void;
    onTaskUpdate: (updatedTask: Partial<Task> & { id: string }) => void;
    level: number;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, customFields, fieldOptions, onOpenTask, onTaskUpdate, level }) => {
    
    // --- NUEVO: Estado para controlar si las subtareas están expandidas ---
    const [isExpanded, setIsExpanded] = useState(true);

    const hasChildren = task.children && task.children.length > 0;

    const handleTitleSave = (newTitle: string) => { onTaskUpdate({ id: task.id, title: newTitle }); };
    const formatDate = (dateString: string | null) => {
        if (!dateString) return <span className="text-gray-400">-</span>;
        const date = new Date(dateString.replace(/-/g, '/'));
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };
    const renderCustomField = (field: CustomField) => {
        const valueData = task.customFields?.[field.id];
        if (!valueData) return <span className="text-gray-400">-</span>;
        switch(field.type) {
            case 'dropdown':
                if (!valueData.optionId) return <span className="text-gray-400">-</span>;
                const option = (fieldOptions[field.id] || []).find(opt => opt.id === valueData.optionId);
                if (!option) return <span className="text-gray-400">-</span>;
                return <Tag text={option.value} color={option.color} />;
            case 'labels':
                const selectedOptionIds = valueData.optionIds || [];
                if (selectedOptionIds.length === 0) return <span className="text-gray-400">-</span>;
                const allOptions = fieldOptions[field.id] || [];
                return (<div className="flex flex-wrap gap-1">{selectedOptionIds.map(id => { const option = allOptions.find(opt => opt.id === id); if (!option) return null; return (<Tag key={id} text={option.value} color={option.color} />);})}</div>);
            case 'text':
                return <div className="max-w-[150px] truncate" title={valueData.value}>{valueData.value || <span className="text-gray-400">-</span>}</div>;
            default:
                return <span className="text-gray-400">-</span>;
        }
    };
    
    const priorityField = customFields.find(f => f.name.toLowerCase() === 'prioridad');
    const otherCustomFields = customFields.filter(f => f.name.toLowerCase() !== 'prioridad');

    return (
        <>
            <tr className="bg-white border-b hover:bg-gray-50 group">
                <td className="px-6 py-2 font-medium text-gray-900 whitespace-nowrap">
                    <div style={{ paddingLeft: `${level * 24}px` }} className="flex items-center gap-2">
                        {/* --- NUEVO: Flecha para expandir/contraer --- */}
                        {hasChildren ? (
                            <button onClick={() => setIsExpanded(!isExpanded)} className="p-0.5 rounded-full hover:bg-gray-200">
                                <svg className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                            </button>
                        ) : (
                            <div className="w-5"></div> // Espaciador para alinear
                        )}
                        
                        {/* (Iconos de dependencias) */}
                        <EditableCell initialValue={task.title} onSave={handleTitleSave} />
                    </div>
                </td>
                <td className="px-6 py-2">{formatDate(task.dueDate)}</td>
                <td className="px-6 py-2">
                    <div className="flex -space-x-2">
                        {task.assignees && task.assignees.map(assignee => (<Avatar key={assignee.id} name={assignee.name} />))}
                        {(!task.assignees || task.assignees.length === 0) && <Avatar />}
                    </div>
                </td>
                <td className="px-6 py-2">
                    {priorityField ? renderCustomField(priorityField) : <span className="text-gray-400">-</span>}
                </td>
                {otherCustomFields.map(field => (<td key={field.id} className="px-6 py-2">{renderCustomField(field)}</td>))}
                <td className="px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity text-center">
                    <button onClick={() => onOpenTask(task, task.listId)} className="font-medium text-blue-600 hover:underline text-xs" title="Abrir detalles">Abrir</button>
                    <button onClick={() => onOpenTask(null, task.listId, task.id)} className="ml-2 font-bold text-blue-600 hover:underline text-lg" title="Añadir Subtarea">+</button>
                </td>
            </tr>
            {/* --- NUEVO: Renderizado condicional de las subtareas --- */}
            {isExpanded && hasChildren && task.children.map(childTask => (
                <TaskRow key={childTask.id} task={childTask} customFields={customFields} fieldOptions={fieldOptions} onOpenTask={onOpenTask} onTaskUpdate={onTaskUpdate} level={level + 1}/>
            ))}
        </>
    );
};
export default TaskRow;