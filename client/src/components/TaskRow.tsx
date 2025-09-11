import React from 'react';
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
    
    const handleTitleSave = (newTitle: string) => { onTaskUpdate({ id: task.id, title: newTitle }); };
    const formatDate = (dateString: string | null) => {
        if (!dateString) return <span className="text-gray-400">-</span>;
        const date = new Date(dateString.replace(/-/g, '/'));
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    // --- FUNCIÓN DE RENDERIZADO CORREGIDA ---
    const renderCustomField = (field: CustomField) => {
        const valueData = task.customFields?.[field.id];
        
        // Si no hay datos para este campo en esta tarea, no mostramos nada.
        if (!valueData) return <span className="text-gray-400">-</span>;

        switch(field.type) {
            case 'dropdown':
                // Para dropdown, necesitamos un optionId
                if (!valueData.optionId) return <span className="text-gray-400">-</span>;
                const option = (fieldOptions[field.id] || []).find(opt => opt.id === valueData.optionId);
                if (!option) return <span className="text-gray-400">-</span>;
                return <Tag text={option.value} color={option.color} />;

            case 'labels':
                // Para labels, necesitamos el array optionIds
                const selectedOptionIds = valueData.optionIds || [];
                if (selectedOptionIds.length === 0) return <span className="text-gray-400">-</span>;
                
                const allOptions = fieldOptions[field.id] || [];
                return (
                    <div className="flex flex-wrap gap-1">
                        {selectedOptionIds.map(id => {
                            const option = allOptions.find(opt => opt.id === id);
                            if (!option) return null;
                            return <Tag key={id} text={option.value} color={option.color} />;
                        })}
                    </div>
                );

            case 'text':
                return <div className="max-w-[150px] truncate" title={valueData.value}>{valueData.value || <span className="text-gray-400">-</span>}</div>;
                
            default:
                return <span className="text-gray-400">-</span>;
        }
    };
    
    // --- CORRECCIÓN EN EL FILTRADO DE CAMPOS A MOSTRAR ---
    const priorityField = customFields.find(f => f.name.toLowerCase() === 'prioridad');
    // Ahora filtramos de la misma forma que en TaskGrid para mantener la consistencia
    const otherCustomFields = customFields.filter(f => f.name.toLowerCase() !== 'prioridad');

    return (
        <>
            <tr className="bg-white border-b hover:bg-gray-50 group">
                <td className="px-6 py-2 font-medium text-gray-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                        {task.waitingFor && task.waitingFor.length > 0 && 
                            <div title={`Esperando a: ${task.waitingFor.map(t => t.title).join(', ')}`}>
                                <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path></svg>
                            </div>
                        }
                        {task.blocking && task.blocking.length > 0 &&
                             <div title={`Bloqueando a: ${task.blocking.map(t => t.title).join(', ')}`}>
                                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                            </div>
                        }
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
            {task.children && task.children.map(childTask => (
                <TaskRow key={childTask.id} task={childTask} customFields={customFields} fieldOptions={fieldOptions} onOpenTask={onOpenTask} onTaskUpdate={onTaskUpdate} level={level + 1}/>
            ))}
        </>
    );
};
export default TaskRow;