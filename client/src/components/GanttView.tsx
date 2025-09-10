// src/components/GanttView.tsx

import React, { useRef, useEffect, useMemo } from 'react';
import Gantt from 'frappe-gantt';
import type { Task } from '../types';

interface GanttViewProps {
    tasks: Task[];
    onOpenTask: (task: Task) => void;
}

const GanttView: React.FC<GanttViewProps> = ({ tasks, onOpenTask }) => {
    const ganttContainerRef = useRef<SVGSVGElement | null>(null);
    const ganttInstance = useRef<Gantt | null>(null);

    // 1. Transformamos nuestras tareas al formato que Frappe Gantt necesita
    const frappeTasks = useMemo(() => {
        return tasks
            .filter(task => task.dueDate) // Solo tareas con fecha de entrega
            .map(task => ({
                id: task.id,
                name: task.title,
                start: task.startDate?.split(' ')[0] || task.dueDate!.split(' ')[0],
                end: task.dueDate!.split(' ')[0],
                progress: 0, // Puedes conectar esto a un campo si lo tienes
                dependencies: task.waitingFor?.map(dep => dep.id).join(', ') || ''
            }));
    }, [tasks]);

    useEffect(() => {
        // 2. Creamos la instancia de Gantt cuando el componente se monta y hay tareas
        if (ganttContainerRef.current && frappeTasks.length > 0) {
            ganttInstance.current = new Gantt(ganttContainerRef.current, frappeTasks, {
                // 3. Configuramos el evento onClick para abrir nuestro modal
                on_click: (task) => {
                    const originalTask = tasks.find(t => t.id === task.id);
                    if (originalTask) {
                        onOpenTask(originalTask);
                    }
                },
                bar_height: 20,
                bar_corner_radius: 3,
                padding: 18,
                view_mode: 'Day', // Puedes cambiar a 'Week' o 'Month'
                language: 'es' // Soporta español
            });
        }
    }, [frappeTasks, onOpenTask]);


    if (frappeTasks.length === 0) {
        return <div className="p-10 text-center text-gray-500">No hay tareas con fechas para mostrar en el gráfico de Gantt.</div>;
    }

    // 4. Creamos el contenedor SVG donde se dibujará el gráfico
    return (
        <div className="p-4 overflow-auto">
            <svg ref={ganttContainerRef}></svg>
        </div>
    );
};

export default GanttView;