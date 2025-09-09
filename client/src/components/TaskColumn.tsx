import React from 'react';
import type { List, Task } from '../types';
import TaskCard from './TaskCard.tsx';

interface TaskColumnProps {
  list: List;
  onOpenTask: (task: Task | null, listId: string) => void; 
}

const TaskColumn: React.FC<TaskColumnProps> = ({ list, onOpenTask }) => {
  return (
    <div className="bg-gray-100 rounded-lg p-3 w-80 flex-shrink-0 flex flex-col">
      <h3 className="font-bold text-md mb-4 px-1 flex-shrink-0">{list.name}</h3>
      <div className="space-y-3 overflow-y-auto flex-grow">
        {list.tasks && Array.isArray(list.tasks) ? list.tasks.map(task => (
          <TaskCard key={task.id} task={task} onClick={() => onOpenTask(task, list.id)} />
        )) : <p className="text-xs text-red-500">Error: tasks no es un array.</p>}
      </div>
      <button 
        onClick={() => onOpenTask(null, list.id)}
        className="mt-3 p-2 w-full text-left text-sm text-gray-500 hover:bg-gray-200 rounded"
      >
        + Añadir tarea
      </button>
    </div>
  );
};

export default TaskColumn;