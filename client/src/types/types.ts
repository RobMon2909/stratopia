// Define la estructura para un Usuario
export interface User {
  id: number;
  name: string;
  initials: string; // Ej: "RM" para "Roberto Morales"
}

// Actualiza la interfaz de la Tarea
export interface Task {
  id: number;
  name: "tarea 1" | "tarea 2"; // Esto parece ser un ejemplo, lo mantenemos por ahora
  task_name: string;
  due_date: string;
  status: "pendiente" | "en progreso" | "completado";
  priority: "alta" | "media" | "baja";
  
  // Nuevos campos opcionales
  description?: string;
  assignedUsers?: number[]; // Un array con los IDs de los usuarios asignados
  // attachments?: any[]; // Podríamos agregar esto para los adjuntos
  // customFields?: any; // Para los campos personalizados
}

export interface TaskListProps {
  tasks: Task[];
}

export interface TaskItemProps {
  task: Task;
}