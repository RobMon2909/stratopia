import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { Task } from '../types';

interface CalendarViewProps {
    tasks: Task[];
    onOpenTask: (task: Task, listId: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onOpenTask }) => {

    const events = tasks
        .filter(task => task.dueDate) // Filtra tareas que no tienen fecha
        .map(task => ({
            id: task.id,
            title: task.title,
            // Aserción de Tipo: Le decimos a TypeScript que confíe en que esto es un string
            date: task.dueDate as string, 
            extendedProps: {
                originalTask: task
            }
        }));

    const handleEventClick = (clickInfo: any) => {
        const task = clickInfo.event.extendedProps.originalTask;
        if (task) {
            onOpenTask(task, task.listId);
        }
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow-md h-full">
            <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,dayGridWeek'
                }}
                events={events}
                eventClick={handleEventClick}
                locale="es"
                buttonText={{
                    today: 'Hoy',
                    month: 'Mes',
                    week: 'Semana',
                }}
                height="100%"
                editable={true} 
            />
        </div>
    );
};

export default CalendarView;