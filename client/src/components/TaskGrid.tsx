import React from 'react';
import type { Task, List, CustomField, FieldOption, NestedTask } from '../types';
import TaskRow from './TaskRow.tsx';
import { groupTasksByDueDate } from '../utils/groupingUtils.ts';
import { nestTasks } from '../utils/taskUtils.ts';

interface TaskGridProps {
    tasks: Task[];
    customFields: CustomField[];
    fieldOptions: { [fieldId: string]: FieldOption[] };
    onOpenTask: (task: Task | null, listId: string, parentId?: string) => void;
    onTaskUpdate: (updatedTask: Partial<Task> & { id: string }) => void;
}

const TaskGrid: React.FC<TaskGridProps> = ({ tasks, customFields, fieldOptions, onOpenTask, onTaskUpdate }) => {
    const topLevelNestedTasks: NestedTask[] = nestTasks(tasks);
    const groupedTasks = groupTasksByDueDate(topLevelNestedTasks);

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