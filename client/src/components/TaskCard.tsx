import React from 'react';
import type { Task } from '../types';

interface TaskCardProps {
    task: Task;
    onClick: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
    // --- LÍNEA DE DEPURACIÓN ---
    // Esto nos mostrará en la consola el objeto de cada tarea individual.
    // console.log("Datos de la tarea en TaskCard:", task);
    
    // Si la tarea o el título no existen, mostramos un mensaje en lugar de romper la app.
    if (!task || typeof task.title === 'undefined') {
        return <div className="bg-red-100 p-3 rounded-md border border-red-300 text-red-700">Error: Datos de tarea inválidos.</div>;
    }

    return (
        <div 
            onClick={onClick}
            className="bg-white p-3 rounded-md shadow-sm border cursor-pointer hover:bg-gray-50"
        >
            <p>{task.title}</p>
        </div>
    );
};

export default TaskCard;