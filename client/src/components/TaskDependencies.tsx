// src/components/TaskDependencies.tsx

import React, { useState } from 'react';
import type { Task } from '../types';
import { createTaskDependency, deleteTaskDependency } from '../services/api';

interface TaskDependenciesProps {
    task: Task;
    allTasks: Task[]; // Lista de todas las tareas para el selector
    onUpdate: () => void; // Función para refrescar los datos del modal
}

const TaskDependencies: React.FC<TaskDependenciesProps> = ({ task, allTasks, onUpdate }) => {
    const [selectedBlockingTask, setSelectedBlockingTask] = useState('');
    const [selectedWaitingTask, setSelectedWaitingTask] = useState('');

    const handleAddDependency = async (type: 'blocking' | 'waitingFor') => {
        const blockingTaskId = type === 'blocking' ? task.id : selectedWaitingTask;
        const waitingTaskId = type === 'waitingFor' ? task.id : selectedBlockingTask;

        if (!blockingTaskId || !waitingTaskId) return;

        try {
            await createTaskDependency({ blockingTaskId, waitingTaskId });
            onUpdate(); // Refresca los datos
            setSelectedBlockingTask('');
            setSelectedWaitingTask('');
        } catch (error) {
            alert('Error al añadir la dependencia. Es posible que ya exista o sea una dependencia circular.');
        }
    };

    const handleRemoveDependency = async (blockingTaskId: string, waitingTaskId: string) => {
        if (!window.confirm("¿Seguro que quieres eliminar esta dependencia?")) return;
        try {
            await deleteTaskDependency({ blockingTaskId, waitingTaskId });
            onUpdate();
        } catch (error) {
            alert('Error al eliminar la dependencia.');
        }
    };
    
    // Filtramos las tareas para no poder seleccionarnos a nosotros mismos
    const availableTasks = allTasks.filter(t => t.id !== task.id);

    return (
    <div className="space-y-4 pt-4 mt-4 border-t border-border">
        <div>
            <h4 className="font-semibold text-sm mb-2 text-foreground-primary">Esperando a (Bloqueada por)</h4>
            {task.waitingFor?.map(t => (
                <div key={t.id} className="flex justify-between items-center bg-background-secondary p-2 rounded text-sm">
                    <span className="text-foreground-secondary">{t.title}</span>
                    <button onClick={() => handleRemoveDependency(t.id, task.id)} className="text-red-500 font-bold">&times;</button>
                </div>
            ))}
            <div className="flex gap-2 mt-2">
                <select value={selectedBlockingTask} onChange={e => setSelectedBlockingTask(e.target.value)} className="w-full p-1 border border-border rounded-md bg-input text-foreground text-sm">
                    <option value="">Selecciona una tarea...</option>
                    {availableTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
                <button onClick={() => handleAddDependency('waitingFor')} className="px-2 py-1 bg-muted text-muted-foreground text-sm rounded-md">Añadir</button>
            </div>
        </div>

            {/* Sección "Bloqueando a" */}
            <div>
                <h4 className="font-semibold text-sm mb-2 text-foreground-primary">Bloqueando a</h4>
                {task.blocking?.map(t => (
                     <div key={t.id} className="flex justify-between items-center bg-background-secondary p-2 rounded text-sm">
                        <span className="text-foreground-secondary">{t.title}</span>
                        <button onClick={() => handleRemoveDependency(task.id, t.id)} className="text-red-500 font-bold">&times;</button>
                    </div>
                ))}
                <div className="flex gap-2 mt-2">
                    <select value={selectedWaitingTask} onChange={e => setSelectedWaitingTask(e.target.value)} className="w-full p-1 border border-border rounded-md bg-input text-foreground text-sm">
                        <option value="">Selecciona una tarea...</option>
                        {availableTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                    <button onClick={() => handleAddDependency('blocking')} className="px-2 py-1 bg-muted text-muted-foreground text-sm rounded-md">Añadir</button>
                </div>
            </div>
        </div>
    );
};

export default TaskDependencies;