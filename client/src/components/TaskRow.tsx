import React from 'react';
import type { Task, CustomField, FieldOption, NestedTask } from '../types';
import EditableCell from './EditableCell.tsx';
import Avatar from './ui/Avatar.tsx';

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

    const renderCustomField = (field: CustomField) => {
        const valueData = task.customFields?.[field.id];
        if (!valueData) return <span className="text-gray-400">-</span>;
        switch(field.type) {
            case 'text':
                return <div className="max-w-[150px] truncate" title={valueData.value}>{valueData.value || <span className="text-gray-400">-</span>}</div>;
            case 'dropdown':
                const dropdownOption = (fieldOptions[field.id] || []).find(opt => opt.id === valueData.optionId);
                if (!dropdownOption) return <span className="text-gray-400">-</span>;
                return <span style={{ backgroundColor: dropdownOption.color + '40', color: dropdownOption.color.replace('85%)', '45%)') }} className="px-2 py-1 text-xs font-bold rounded-full">{dropdownOption.value}</span>;
            case 'labels':
                const selectedIds = valueData.optionIds || [];
                const options = fieldOptions[field.id] || [];
                if (selectedIds.length === 0) return <span className="text-gray-400">-</span>;
                return (<div className="flex flex-wrap gap-1">{selectedIds.map(id => { const option = options.find(opt => opt.id === id); if (!option) return null; return (<span key={id} style={{ backgroundColor: option.color + '40', color: option.color.replace('85%)', '45%)') }} className="px-2 py-1 text-xs font-bold rounded-full">{option.value}</span>);})}</div>);
            default:
                return <span className="text-gray-400">-</span>;
        }
    };

    return (
        <>
            <tr className="bg-white border-b hover:bg-gray-50 group">
                <td className="px-6 py-2 font-medium text-gray-900 whitespace-nowrap">
                    <div style={{ paddingLeft: `${level * 24}px` }} className="flex items-center">
                        <EditableCell initialValue={task.title} onSave={handleTitleSave} />
                    </div>
                </td>
                <td className="px-6 py-2">{formatDate(task.dueDate)}</td>
                <td className="px-6 py-2"><div className="flex -space-x-2">{task.assignees && task.assignees.map(assignee => (<Avatar key={assignee.id} name={assignee.name} />))}</div></td>
                <td className="px-6 py-2">{task.priority || <span className="text-gray-400">-</span>}</td>
                {customFields.map(field => (<td key={field.id} className="px-6 py-2">{renderCustomField(field)}</td>))}
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