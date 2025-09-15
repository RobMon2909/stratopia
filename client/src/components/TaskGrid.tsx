import React, { useMemo } from 'react';
import type { Task, CustomField, FieldOption, NestedTask, User } from '../types';
import TaskRow from './TaskRow';
import { nestTasks } from '../utils/taskUtils';

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
        const validTasks = Array.isArray(tasks) ? tasks : [];
        const topLevelNestedTasks: NestedTask[] = nestTasks(validTasks);
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

    if (!Array.isArray(tasks) || tasks.length === 0) {
        return (
            <div className="text-center p-10 bg-background-secondary rounded-lg">
                <h3 className="text-lg font-medium text-foreground-secondary">No hay tareas que coincidan.</h3>
                <p className="text-sm text-foreground-secondary/70">Prueba a cambiar los filtros o a crear una nueva tarea.</p>
            </div>
        );
    }

    const headerCustomFields = customFields.filter(f => f.name.toLowerCase() !== 'prioridad');
    const totalColumns = 5 + headerCustomFields.length;

    return (
        <div className="w-full overflow-x-auto bg-card rounded-lg shadow-md">
            <table className="w-full text-sm text-left text-foreground-secondary">
                <thead className="text-xs text-foreground-primary uppercase bg-background-secondary">
                    <tr>
                        <th scope="col" className="px-6 py-3 min-w-[300px]">Nombre de Tarea</th>
                        <th scope="col" className="px-6 py-3">Fecha Límite</th>
                        <th scope="col" className="px-6 py-3">Asignado</th>
                        <th scope="col" className="px-6 py-3">Prioridad</th>
                        {headerCustomFields.map(field => (<th key={field.id} scope="col" className="px-6 py-3">{field.name}</th>))}
                        <th scope="col" className="px-4 py-3 w-[100px]"><span className="sr-only">Acciones</span></th>
                    </tr>
                </thead>
                {Array.from(groupedTasks.entries()).map(([groupName, tasksInGroup]) => (
                    <tbody key={groupName}>
                        <tr className="bg-background-secondary border-b border-border sticky top-0 z-10">
                            <td colSpan={totalColumns} className="px-4 py-2">
                                <span className="font-bold text-foreground-primary uppercase text-xs">{groupName}</span>
                                <span className="ml-2 text-foreground-secondary font-semibold">{tasksInGroup.length}</span>
                            </td>
                        </tr>
                        {tasksInGroup.map(task => (
                            <TaskRow key={task.id} task={task} customFields={customFields} fieldOptions={fieldOptions} onOpenTask={onOpenTask} onTaskUpdate={onTaskUpdate} level={0} />
                        ))}
                         <tr className="hover:bg-background-secondary">
                            <td colSpan={totalColumns} className="px-6 py-2">
                                <button onClick={() => onOpenTask(null, tasksInGroup[0]?.listId || '')} className="text-xs text-foreground-secondary font-semibold hover:text-blue-600">
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