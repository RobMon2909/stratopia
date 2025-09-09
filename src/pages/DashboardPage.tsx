import React, { useState, useEffect } from 'react';
import WorkspaceSidebar from '../components/WorkspaceSidebar';
import TaskList from '../components/TaskList';
import { getWorkspaces } from '../services/api'; // Función para llamar a la API

const DashboardPage: React.FC = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      const res = await getWorkspaces();
      setWorkspaces(res.data);
      if (res.data.length > 0) {
        setActiveWorkspace(res.data[0]);
      }
    };
    fetchWorkspaces();
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      <WorkspaceSidebar workspaces={workspaces} setActiveWorkspace={setActiveWorkspace} />
      <main className="flex-1 p-8">
        {activeWorkspace ? (
          <TaskList workspace={activeWorkspace} />
        ) : (
          <p>Selecciona un espacio de trabajo o crea uno nuevo.</p>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;