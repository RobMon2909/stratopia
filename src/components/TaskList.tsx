import React, { useState, useEffect } from 'react';
import { getListsAndTasks } from '../services/api';
import TaskCard from './TaskCard';

interface Props {
  workspace: any;
}

const TaskList: React.FC<Props> = ({ workspace }) => {
  const [lists, setLists] = useState([]);

  useEffect(() => {
    const fetchLists = async () => {
      const res = await getListsAndTasks(workspace.id);
      setLists(res.data);
    };
    fetchLists();
  }, [workspace]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{workspace.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {lists.map((list: any) => (
          <div key={list.id} className="bg-white p-4 rounded-lg shadow">
            <h2 className="font-bold mb-4">{list.name}</h2>
            <div>
              {list.tasks.map((task: any) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskList;