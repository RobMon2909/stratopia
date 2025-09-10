import React, { useMemo } from 'react';
import type { Task, CustomField, FieldOption, NestedTask, User } from '../types';
import TaskRow from './TaskRow.tsx';
import { nestTasks } from '../utils/taskUtils.ts'; // Asumo que tienes este archivo de utils

// Definimos el tipo para las opciones de agrupación que vienen del Dashboard
type GroupByOption = 'default' | 'priority' | 'dueDate' | 'assignee' | 'status';

interface TaskGridProps {
    tasks: Task[];
    customFields: CustomField[];
    fieldOptions: { [fieldId: string]: FieldOption[] };
    onOpenTask: (task: Task | null, listId: string, parentId?: string) => void;
    onTaskUpdate: (updatedTask: Partial<Task> & { id: string }) => void;
    groupBy: GroupByOption; // <-- NUEVA PROP
    allUsers: User[]; // <-- NUEVA PROP para agrupar por asignado
    statusOptions: FieldOption[]; // <-- NUEVA PROP para agrupar por estado
    statusField: CustomField | undefined; // <-- NUEVA PROP para agrupar por estado
}

const TaskGrid: React.FC<TaskGridProps> = ({ 
    tasks, customFields, fieldOptions, onOpenTask, 
    onTaskUpdate, groupBy, allUsers, statusOptions, statusField 
}) => {

    const groupedTasks = useMemo(() => {
        const topLevelNestedTasks: NestedTask[] = nestTasks(tasks);
        const groups = new Map<string, NestedTask[]>();

        if (groupBy === 'default') {
            groups.set('Todas las Tareas', topLevelNestedTasks);
            return groups;
        }

        topLevelNestedTasks.forEach(task => {
            let groupKey = 'Sin Asignar'; // Valor por defecto

            switch (groupBy) {
                case 'priority':
                    groupKey = task.priority || 'Sin Prioridad';
                    break;
                case 'dueDate':
                    if (task.dueDate) {
                        groupKey = new Date(task.dueDate.replace(/-/g, '/')).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    } else {
                        groupKey = 'Sin Fecha Límite';
                    }
                    break;
                case 'assignee':
                    if (task.assignees && task.assignees.length > 0) {
                        groupKey = task.assignees[0].name; // Agrupamos por el primer asignado
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
            }
            
            if (!groups.has(groupKey)) {
                groups.set(groupKey, []);
            }
            groups.get(groupKey)!.push(task);
        });

        return groups;
    }, [tasks, groupBy, allUsers, statusField, statusOptions]);


    if (tasks.length === 0) {
        return <div className="text-center p-10 bg-gray-50 rounded-lg"><h3 className="text-lg font-medium text-gray-500">No hay tareas que coincidan.</h3><p className="text-sm text-gray-400">Prueba a cambiar los filtros o a crear una nueva tarea.</p></div>
    }

    return (
        <div className="w-full overflow-x-auto bg-white rounded-lg shadow-md">
            <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 min-w-[300px]">Nombre de Tarea</th>
                        <th scope="col" className="px-6 py-3">Fecha Límite</th>
                        <th scope="col" className="px-6 py-3">Asignado</th>
                        <th scope="col" className="px-6 py-3">Prioridad</th>
                        {customFields.map(field => (<th key={field.id} scope="col" className="px-6 py-3">{field.name}</th>))}
                        <th scope="col" className="px-4 py-3 w-[100px]"><span className="sr-only">Acciones</span></th>
                    </tr>
                </thead>
                {/* --- LÓGICA DE RENDERIZADO MODIFICADA PARA USAR GRUPOS --- */}
                {Array.from(groupedTasks.entries()).map(([groupName, tasksInGroup]) => (
                    <tbody key={groupName}>
                        <tr className="bg-gray-100 border-b">
                            <td colSpan={customFields.length + 6} className="px-4 py-2">
                                <span className="font-bold text-gray-800 uppercase text-xs">{groupName}</span>
                                <span className="ml-2 text-gray-500 font-semibold">{tasksInGroup.length}</span>
                            </td>
                        </tr>
                        {tasksInGroup.map(task => (
                            <TaskRow key={task.id} task={task} customFields={customFields} fieldOptions={fieldOptions} onOpenTask={onOpenTask} onTaskUpdate={onTaskUpdate} level={0} />
                        ))}
                         <tr className="hover:bg-gray-50">
                            <td colSpan={customFields.length + 6} className="px-6 py-2">
                                <button onClick={() => onOpenTask(null, tasksInGroup[0]?.listId || '')} className="text-xs text-gray-500 font-semibold hover:text-blue-600">
                                    + Agregar Tarea al Grupo
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