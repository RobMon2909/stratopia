import React, { useMemo } from 'react';
import type { Task, CustomField, FieldOption, NestedTask, User } from '../types';
import TaskRow from './TaskRow.tsx';
import { nestTasks } from '../utils/taskUtils.ts';

type GroupByOption = 'default' | 'priority' | 'dueDate' | 'assignee' | 'status';

interface TaskGridProps {
    tasks: Task[];
    customFields: CustomField[];
    fieldOptions: { [fieldId: string]: FieldOption[] };
    onOpenTask: (task: Task | null, listId: string, parentId?: string) => void;
    onTaskUpdate: (updatedTask: Partial<Task> & { id: string }) => void;
    groupBy: GroupByOption;
    allUsers: User[];
    statusOptions: FieldOption[];
    statusField: CustomField | undefined;
}

const TaskGrid: React.FC<TaskGridProps> = ({ tasks, customFields, fieldOptions, onOpenTask, onTaskUpdate, groupBy, allUsers, statusOptions, statusField }) => {

    const groupedTasks = useMemo(() => {
        const topLevelNestedTasks: NestedTask[] = nestTasks(tasks);
        const groups = new Map<string, NestedTask[]>();
        const priorityField = customFields.find(f => f.name.toLowerCase() === 'prioridad');

        if (groupBy === 'default') {
            groups.set('Todas las Tareas', topLevelNestedTasks);
            return groups;
        }

        topLevelNestedTasks.forEach(task => {
            let groupKey: string = 'Sin Agrupar';
            switch (groupBy) {
                case 'priority':
                    if (priorityField && task.customFields?.[priorityField.id]?.optionId) {
                        const optionId = task.customFields[priorityField.id].optionId;
                        const priorityOptions = fieldOptions[priorityField.id] || [];
                        const option = priorityOptions.find(opt => opt.id === optionId);
                        groupKey = option ? option.value : 'Sin Prioridad';
                    } else {
                        groupKey = 'Sin Prioridad';
                    }
                    break;
                case 'status':
                    if (statusField && task.customFields?.[statusField.id]?.optionId) {
                        const optionId = task.customFields[statusField.id].optionId;
                        const option = statusOptions.find(opt => opt.id === optionId);
                        groupKey = option ? option.value : 'Sin Estado';
                    } else {
                        groupKey = 'Sin Estado';
                    }
                    break;
                case 'assignee':
                    if (task.assignees && task.assignees.length > 0) {
                        groupKey = task.assignees[0].name;
                    } else {
                        groupKey = 'Sin Asignar';
                    }
                    break;
                case 'dueDate':
                    if (task.dueDate) {
                        groupKey = new Date(task.dueDate.replace(/-/g, '/')).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
                    } else {
                        groupKey = 'Sin Fecha Límite';
                    }
                    break;
            }
            if (!groups.has(groupKey)) {
                groups.set(groupKey, []);
            }
            groups.get(groupKey)!.push(task);
        });
        return groups;
    }, [tasks, groupBy, customFields, fieldOptions, allUsers, statusField, statusOptions]);

    if (tasks.length === 0) {
        return <div className="text-center p-10 bg-gray-50 rounded-lg"><h3 className="text-lg font-medium text-gray-500">No hay tareas que coincidan.</h3><p className="text-sm text-gray-400">Prueba a cambiar los filtros o a crear una nueva tarea.</p></div>
    }

    // --- CORRECCIÓN EN EL ENCABEZADO DE LA TABLA ---
    const headerCustomFields = customFields.filter(f => f.name.toLowerCase() !== 'prioridad');
    const totalColumns = 4 + headerCustomFields.length;

    return (
        <div className="w-full overflow-x-auto bg-white rounded-lg shadow-md">
            <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 min-w-[300px]">Nombre de Tarea</th>
                        <th scope="col" className="px-6 py-3">Fecha Límite</th>
                        <th scope="col" className="px-6 py-3">Asignado</th>
                        <th scope="col" className="px-6 py-3">Prioridad</th>
                        {/* Se asegura de mostrar todos los demás campos personalizados */}
                        {headerCustomFields.map(field => (<th key={field.id} scope="col" className="px-6 py-3">{field.name}</th>))}
                        <th scope="col" className="px-4 py-3 w-[100px]"><span className="sr-only">Acciones</span></th>
                    </tr>
                </thead>
                {Array.from(groupedTasks.entries()).map(([groupName, tasksInGroup]) => (
                    <tbody key={groupName}>
                        <tr className="bg-gray-100 border-b sticky top-0 z-10">
                            <td colSpan={totalColumns} className="px-4 py-2">
                                <span className="font-bold text-gray-800 uppercase text-xs">{groupName}</span>
                                <span className="ml-2 text-gray-500 font-semibold">{tasksInGroup.length}</span>
                            </td>
                        </tr>
                        {tasksInGroup.map(task => (
                            <TaskRow key={task.id} task={task} customFields={customFields} fieldOptions={fieldOptions} onOpenTask={onOpenTask} onTaskUpdate={onTaskUpdate} level={0} />
                        ))}
                         <tr className="hover:bg-gray-50">
                            <td colSpan={totalColumns} className="px-6 py-2">
                                <button onClick={() => onOpenTask(null, tasksInGroup[0]?.listId || '')} className="text-xs text-gray-500 font-semibold hover:text-blue-600">
                                    + Agregar Tarea
                                </button>
                            </td>
                        </tr>
                    </tbody>
                ))}
            </table>
        </div>
    );
};
export default TaskGrid;