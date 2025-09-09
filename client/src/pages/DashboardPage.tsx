import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getWorkspaces, createWorkspace, getWorkspaceLists, getCustomFields, getFieldOptions, updateTask, createList, getWorkspaceMembers, searchTasks } from '../services/api.ts'; 
import { useAuth } from '../hooks/useAuth.ts';
import type { Task, List, Workspace, CustomField, FieldOption, User, NestedTask } from '../types';
import TaskModal from '../components/TaskModal.tsx';
import TaskGrid from '../components/TaskGrid.tsx';
import BoardView from '../components/BoardView.tsx';
import CalendarView from '../components/CalendarView.tsx';
import { useDebounce } from '../hooks/useDebounce.ts';

type ViewType = 'list' | 'board' | 'calendar';

const DashboardPage: React.FC = () => {
    const { user, logout } = useAuth();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
    const [lists, setLists] = useState<List[]>([]);
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [fieldOptions, setFieldOptions] = useState<{ [fieldId: string]: FieldOption[] }>({});
    const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState("");
    const [isSubmittingWorkspace, setIsSubmittingWorkspace] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [listIdForNewTask, setListIdForNewTask] = useState<string | null>(null);
    const [parentIdForNewTask, setParentIdForNewTask] = useState<string | undefined>();
    const [currentView, setCurrentView] = useState<ViewType>('list');
    const [workspaceMembers, setWorkspaceMembers] = useState<User[]>([]);
    const [activeFilters, setActiveFilters] = useState({ assigneeId: 'all', statusId: 'all' });
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Task[] | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const fetchDataForWorkspace = useCallback(async () => {
        if (!activeWorkspace) return;
        setLoadingData(true);
        try {
            const [listsRes, fieldsRes, membersRes] = await Promise.all([
                getWorkspaceLists(activeWorkspace.id),
                getCustomFields(activeWorkspace.id),
                getWorkspaceMembers(activeWorkspace.id)
            ]);
            setLists(listsRes.data);
            setCustomFields(fieldsRes.data);
            setWorkspaceMembers(membersRes.data);
            const optionsToFetch = fieldsRes.data.filter((f: CustomField) => f.type === 'dropdown' || f.type === 'labels');
            if (optionsToFetch.length > 0) {
                const optionPromises = optionsToFetch.map((field: CustomField) => getFieldOptions(field.id));
                const optionResults = await Promise.all(optionPromises);
                const optionsMap: { [fieldId: string]: FieldOption[] } = {};
                optionsToFetch.forEach((field: CustomField, index: number) => {
                    optionsMap[field.id] = optionResults[index].data;
                });
                setFieldOptions(optionsMap);
            }
        } catch (error) { console.error("Failed to fetch workspace data", error); } 
        finally { setLoadingData(false); }
    }, [activeWorkspace]);

    useEffect(() => {
        if (user) {
            getWorkspaces().then(res => {
                setWorkspaces(res.data);
                if (res.data.length > 0 && !activeWorkspace) {
                    setActiveWorkspace(res.data[0]);
                }
            }).catch(err => console.error("Failed to fetch workspaces", err))
            .finally(() => setLoadingWorkspaces(false));
        }
    }, [user]);

    useEffect(() => {
        fetchDataForWorkspace();
    }, [activeWorkspace]);

    useEffect(() => {
        if (debouncedSearchTerm && activeWorkspace) {
            setIsSearching(true);
            searchTasks(activeWorkspace.id, debouncedSearchTerm)
                .then(res => setSearchResults(res.data))
                .catch(err => console.error("Search failed", err))
                .finally(() => setIsSearching(false));
        } else {
            setSearchResults(null);
        }
    }, [debouncedSearchTerm, activeWorkspace]);
    
    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWorkspaceName.trim()) { return; }
        setIsSubmittingWorkspace(true);
        try {
            const res = await createWorkspace({ name: newWorkspaceName });
            setWorkspaces(current => [...current, res.data.workspace]);
            setActiveWorkspace(res.data.workspace);
            setIsWorkspaceModalOpen(false); setNewWorkspaceName("");
        } catch (err: any) { alert(err.response?.data?.message || "Error al crear."); } 
        finally { setIsSubmittingWorkspace(false); }
    };

    const handleOpenTaskModal = (task: Task | NestedTask | null, listId: string, parentId?: string) => {
        setSelectedTask(task);
        if (!task) {
            setListIdForNewTask(listId);
            setParentIdForNewTask(parentId);
        }
        setIsTaskModalOpen(true);
    };

    const handleCloseTaskModal = () => {
        setIsTaskModalOpen(false); setSelectedTask(null); setListIdForNewTask(null); setParentIdForNewTask(undefined);
    };
    
    const handleDataNeedsRefresh = () => { fetchDataForWorkspace(); };
    
    const handleTaskUpdated = async (updatedTaskData: Partial<Task> & { id: string }) => {
        setLists(currentLists =>
            currentLists.map(list => ({ ...list,
                tasks: list.tasks.map(task => 
                    task.id === updatedTaskData.id ? { ...task, ...updatedTaskData } : task
                )
            }))
        );
        try {
             await updateTask({ taskId: updatedTaskData.id, ...updatedTaskData });
             fetchDataForWorkspace();
        } catch (error) {
            console.error("Failed to update task", error);
            alert("No se pudo guardar el cambio. Revertiendo.");
            fetchDataForWorkspace();
        }
    };
    
    const handleFilterChange = (filterName: string, value: string) => {
        setActiveFilters(prev => ({ ...prev, [filterName]: value }));
    };

    const allTasks = useMemo(() => lists.reduce((acc, list) => [...acc, ...list.tasks], [] as Task[]), [lists]);
    const tasksToDisplay = searchResults !== null ? searchResults : allTasks;
    
    const statusField = customFields.find(f => f.name.toLowerCase() === 'estado');
    const statusOptions = statusField ? fieldOptions[statusField.id] || [] : [];
    
    const filteredTasks = useMemo(() => {
        return tasksToDisplay.filter(task => {
            if (activeFilters.assigneeId !== 'all' && !(task.assignees || []).find(a => a.id === activeFilters.assigneeId)) return false;
            if (activeFilters.statusId !== 'all' && statusField) {
                const taskStatusValue = task.customFields?.[statusField.id];
                let taskStatusId: string | null = null;
                if(taskStatusValue) {
                    if (statusField.type === 'labels' && taskStatusValue.optionIds && taskStatusValue.optionIds.length > 0) {
                        taskStatusId = taskStatusValue.optionIds[0];
                    } else if (statusField.type === 'dropdown') {
                        taskStatusId = taskStatusValue.optionId ?? null;
                    }
                }
                if (taskStatusId !== activeFilters.statusId) return false;
            }
            return true;
        });
    }, [tasksToDisplay, activeFilters, statusField]);

    const renderCurrentView = () => {
        switch(currentView) {
            case 'board':
                return <BoardView tasks={filteredTasks} statusField={statusField} statusOptions={statusOptions} customFields={customFields} onOpenTask={handleOpenTaskModal} onDataNeedsRefresh={handleDataNeedsRefresh} />;
            case 'calendar':
                return <CalendarView tasks={filteredTasks} onOpenTask={handleOpenTaskModal} />;
            case 'list':
            default:
                return <TaskGrid tasks={filteredTasks} customFields={customFields} fieldOptions={fieldOptions} onOpenTask={handleOpenTaskModal} onTaskUpdate={handleTaskUpdated} />;
        }
    };

    if (loadingWorkspaces) { return <div className="flex justify-center items-center h-screen">Cargando...</div>; }

    return (
        <div className="flex h-screen bg-white text-gray-800">
            <TaskModal isOpen={isTaskModalOpen} onClose={handleCloseTaskModal} listId={selectedTask?.listId || listIdForNewTask} parentId={parentIdForNewTask} taskToEdit={selectedTask} onTaskCreated={handleDataNeedsRefresh} onTaskUpdated={handleDataNeedsRefresh} customFields={customFields} workspaceMembers={workspaceMembers} />
            {isWorkspaceModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={() => setIsWorkspaceModalOpen(false)}>
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold mb-4">Crear Nuevo Espacio</h2>
                        <form onSubmit={handleCreateWorkspace}>
                            <input type="text" value={newWorkspaceName} onChange={(e) => setNewWorkspaceName(e.target.value)} placeholder="Nombre del espacio..." className="w-full p-2 border rounded mb-4" autoFocus />
                            <div className="flex justify-end gap-4">
                                <button type="button" onClick={() => setIsWorkspaceModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded" disabled={isSubmittingWorkspace}>Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={isSubmittingWorkspace}>{isSubmittingWorkspace ? 'Creando...' : 'Crear'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <aside className="w-64 bg-gray-50 p-5 border-r flex flex-col flex-shrink-0">
                <h1 className="text-2xl font-bold text-blue-600 mb-6">Stratopia</h1>
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Espacios</h2>
                    {user?.role === 'ADMIN' && (<button onClick={() => setIsWorkspaceModalOpen(true)} className="text-blue-500 hover:text-blue-700">+</button>)}
                </div>
                <nav className="flex-grow">
                    <ul>
                        {workspaces.map((ws) => (<li key={ws.id}><a href="#" onClick={(e) => { e.preventDefault(); setActiveWorkspace(ws); }} className={`block py-2 px-3 rounded font-medium ${activeWorkspace?.id === ws.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`}>{ws.name}</a></li>))}
                    </ul>
                </nav>
                {user?.role === 'ADMIN' && (<div className="mt-4 pt-4 border-t"><Link to="/admin" className="block py-2 px-3 rounded text-sm font-semibold text-gray-600 hover:bg-gray-100">Panel de Administrador</Link></div>)}
                 <div className="mt-auto pt-4 border-t">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-gray-500 mb-2">{user?.email}</p>
                    <button onClick={logout} className="text-sm text-red-500 hover:underline">Logout</button>
                 </div>
            </aside>
            
            <main className="flex-1 p-6 lg:p-8 flex flex-col overflow-y-hidden">
                {activeWorkspace ? (
                    <>
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <div>
                                <h1 className="text-4xl font-bold text-gray-800">{activeWorkspace.name}</h1>
                                <div className="mt-2 flex items-center border-b">
                                    <button onClick={() => setCurrentView('list')} className={`py-2 px-3 text-sm font-semibold ${currentView === 'list' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Lista</button>
                                    <button onClick={() => setCurrentView('board')} className={`py-2 px-3 text-sm font-semibold ${currentView === 'board' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Tablero</button>
                                    <button onClick={() => setCurrentView('calendar')} className={`py-2 px-3 text-sm font-semibold ${currentView === 'calendar' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Calendario</button>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <input type="text" placeholder="Buscar tareas..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="p-2 border rounded-md pl-8" />
                                    <svg className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                </div>
                                {statusField && (
                                    <div>
                                        <label htmlFor="status-filter" className="text-xs font-semibold text-gray-500">ESTADO</label>
                                        <select id="status-filter" value={activeFilters.statusId} onChange={(e) => handleFilterChange('statusId', e.target.value)} className="ml-2 p-1 border-gray-300 rounded-md text-sm bg-white">
                                            <option value="all">Todos</option>
                                            {statusOptions.map(option => (
                                                <option key={option.id} value={option.id}>{option.value}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label htmlFor="assignee-filter" className="text-xs font-semibold text-gray-500">ASIGNADO</label>
                                    <select id="assignee-filter" value={activeFilters.assigneeId} onChange={(e) => handleFilterChange('assigneeId', e.target.value)} className="ml-2 p-1 border-gray-300 rounded-md text-sm bg-white">
                                        <option value="all">Todos</option>
                                        {workspaceMembers.map(member => (
                                            <option key={member.id} value={member.id}>{member.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <button onClick={() => handleOpenTaskModal(null, lists[0]?.id)} className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow font-semibold hover:bg-blue-700 disabled:bg-blue-300" disabled={lists.length === 0}>
                                    + Añadir Tarea
                                </button>
                            </div>
                        </div>
                        <div className="flex-grow overflow-y-auto">
                        {loadingData || isSearching ? ( <p>Cargando...</p> ) : renderCurrentView()}
                        </div>
                    </>
                ) : (
                    <div className="text-center my-auto">
                       <h2 className="text-2xl font-semibold">¡Bienvenido a Stratopia!</h2>
                       <p className="text-gray-500 mt-2">Selecciona un espacio de trabajo para comenzar.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default DashboardPage;