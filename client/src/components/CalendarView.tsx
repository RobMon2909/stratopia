// src/components/CalendarView.tsx

import React, { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { Task, NestedTask } from '../types';

interface CalendarViewProps {
    tasks: Task[];
    onOpenTask: (task: Task | NestedTask | null, listId: string) => void;
    onTaskUpdate: (updatedTask: any) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onOpenTask, onTaskUpdate }) => {

    // --- LÓGICA CORREGIDA PARA CREAR LOS EVENTOS ---
    const events = useMemo(() => {
        return tasks
            // 1. Nos aseguramos de que cada tarea tenga al menos una fecha de entrega (dueDate).
            .filter(task => !!task.dueDate)
            // 2. Mapeamos las tareas al formato que FullCalendar espera.
            .map(task => ({
                id: task.id,
                title: task.title,
                // Si no hay fecha de inicio, usamos la de entrega como inicio.
                // El '!' al final le dice a TypeScript que estamos seguros de que dueDate no es null aquí.
                start: task.startDate || task.dueDate!,
                end: task.dueDate!,
                allDay: !task.startDate,
                extendedProps: { listId: task.listId }
            }));
    }, [tasks]);
    
    const handleEventDrop = (info: any) => {
        const { event } = info;
        const updatedTask = {
            taskId: event.id,
            startDate: event.startStr,
            dueDate: event.endStr || event.startStr
        };
        onTaskUpdate(updatedTask);
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow-md h-full">
            <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={events}
                eventClick={(info) => {
                    const task = tasks.find(t => t.id === info.event.id);
                    if (task) {
                        onOpenTask(task, task.listId);
                    }
                }}
                editable={true}
                eventDrop={handleEventDrop}
                height="100%"
            />
        </div>
    );
};

export default CalendarView;