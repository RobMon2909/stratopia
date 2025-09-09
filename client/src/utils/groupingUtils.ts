import type { NestedTask } from '../types'; // Importamos NestedTask en lugar de Task

// Esta función compara dos fechas ignorando la hora
const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
};

// --- CORRECCIÓN CLAVE: La función ahora trabaja con NestedTask ---
export const groupTasksByDueDate = (tasks: NestedTask[]): Map<string, NestedTask[]> => {
    const grouped = new Map<string, NestedTask[]>();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    tasks.forEach(task => {
        let groupName = 'Sin Fecha';
        
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate + 'T00:00:00');

            if (dueDate < today) {
                groupName = 'Atrasado';
            } else if (isSameDay(dueDate, today)) {
                groupName = 'Hoy';
            } else if (isSameDay(dueDate, tomorrow)) {
                groupName = 'Mañana';
            } else {
                groupName = dueDate.toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' });
            }
        }
        
        if (!grouped.has(groupName)) {
            grouped.set(groupName, []);
        }
        grouped.get(groupName)!.push(task);
    });

    // La lógica de ordenamiento también necesita una pequeña corrección
    const taskDateMap = new Map(tasks.filter(t => t.dueDate).map(t => [t.id, new Date(t.dueDate + 'T00:00:00').getTime()]));

    const sortedGrouped = new Map([...grouped.entries()].sort((a, b) => {
        if (a[0] === 'Atrasado') return -1; if (b[0] === 'Atrasado') return 1;
        if (a[0] === 'Hoy') return -1; if (b[0] === 'Hoy') return 1;
        if (a[0] === 'Mañana') return -1; if (b[0] === 'Mañana') return 1;
        if (a[0] === 'Sin Fecha') return 1; if (b[0] === 'Sin Fecha') return -1;
        
        const dateA = taskDateMap.get(a[1][0].id) || 0;
        const dateB = taskDateMap.get(b[1][0].id) || 0;
        return dateA - dateB;
    }));

    return sortedGrouped;
};