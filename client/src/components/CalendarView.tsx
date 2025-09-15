// src/components/CalendarView.tsx

import React, { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { updateTask } from '../services/api'; // <-- IMPORTAMOS LA FUNCIÓN DE LA API
import type { Task, NestedTask } from '../types';

interface CalendarViewProps {
    tasks: Task[];
    onOpenTask: (task: Task | NestedTask | null, listId: string) => void;
    onDataNeedsRefresh: () => void; // <-- CAMBIAMOS EL NOMBRE PARA CLARIDAD
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onOpenTask, onDataNeedsRefresh }) => {

    const events = useMemo(() => {
        return tasks
            .filter(task => !!task.dueDate)
            .map(task => ({
                id: task.id,
                title: task.title,
                start: task.startDate || task.dueDate!,
                end: task.dueDate!,
                allDay: !task.startDate,
                extendedProps: { listId: task.listId }
            }));
    }, [tasks]);
    
    // --- LÓGICA CORREGIDA PARA GUARDAR EL CAMBIO ---
    const handleEventDrop = async (info: any) => {
        const { event, oldEvent } = info;
        const updatedTaskPayload = {
            taskId: event.id,
            startDate: event.startStr,
            dueDate: event.endStr || event.startStr
        };

        try {
            // 1. Enviamos la actualización al backend
            await updateTask(updatedTaskPayload);
            // 2. (Opcional) Mostramos una confirmación
            console.log(`Tarea "${event.title}" movida a ${event.startStr}`);
            // 3. Pedimos al dashboard que refresque todos los datos para mantener la consistencia
            onDataNeedsRefresh();
        } catch (error) {
            console.error("Failed to update task date", error);
            alert("No se pudo guardar el cambio de fecha.");
            // Si falla, revertimos el evento a su posición original en la UI
            info.revert();
        }
    };

    return (
        <div className="p-4 bg-card rounded-lg shadow-md h-full">
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