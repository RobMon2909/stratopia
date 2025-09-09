import type { Task } from '../types';

// Definimos un nuevo tipo que extiende Task para incluir a los hijos
export type NestedTask = Task & { children: NestedTask[] };

export const nestTasks = (tasks: Task[]): NestedTask[] => {
    const taskMap = new Map<string, NestedTask>();
    const topLevelTasks: NestedTask[] = [];

    // Primer paso: Inicializar cada tarea con un array de 'children' vacío
    tasks.forEach(task => {
        taskMap.set(task.id, { ...task, children: [] });
    });

    // Segundo paso: Asignar cada tarea a su padre
    taskMap.forEach(task => {
        if (task.parentId && taskMap.has(task.parentId)) {
            // Si tiene un padre válido, lo añadimos al array 'children' del padre
            const parent = taskMap.get(task.parentId)!;
            parent.children.push(task);
        } else {
            // Si no tiene padre, es de nivel superior
            topLevelTasks.push(task);
        }
    });

    return topLevelTasks;
};