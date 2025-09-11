import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
    getWorkspaces, createWorkspace, getWorkspaceLists, getCustomFields, 
    getFieldOptions, updateTask, getWorkspaceMembers, searchTasks, 
    getNotifications, markNotificationsAsRead 
} from '../services/api';
import socketService from '../services/socketService';
import NotificationsPanel from '../components/NotificationsPanel.tsx';
import type { Notification } from '../components/NotificationsPanel.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import type { Task, List, Workspace, CustomField, FieldOption, User, NestedTask } from '../types';
import TaskModal from '../components/TaskModal.tsx';
import TaskGrid from '../components/TaskGrid.tsx';
import BoardView from '../components/BoardView.tsx';
import CalendarView from '../components/CalendarView.tsx';
import { useDebounce } from '../hooks/useDebounce.ts';

type ViewType = 'list' | 'board' | 'calendar';
type GroupByOption = 'default' | 'priority' | 'dueDate' | 'assignee' | 'status';

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
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [groupBy, setGroupBy] = useState<GroupByOption>('default');
    const [hideDoneTasks, setHideDoneTasks] = useState<boolean>(() => {
        const savedPreference = localStorage.getItem('hideDoneTasks');
        return savedPreference === 'true'; 
    });

    useEffect(() => {
        localStorage.setItem('hideDoneTasks', String(hideDoneTasks));
    }, [hideDoneTasks]);

    const allTasks = useMemo(() => lists.reduce((acc, list) => [...acc, ...list.tasks], [] as Task[]), [lists]);

    const fetchDataForWorkspace = useCallback(async () => {
        if (!activeWorkspace) return;
        setLoadingData(true);
        try {
            const [listsRes, fieldsRes, membersRes] = await Promise.all([
                getWorkspaceLists(activeWorkspace.id, groupBy),
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
    }, [activeWorkspace, groupBy]);

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
    }, [user, activeWorkspace]);

    useEffect(() => {
        fetchDataForWorkspace();
    }, [fetchDataForWorkspace]);

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

    useEffect(() => {
        const fetchNotifications = () => { getNotifications().then(res => setNotifications(res.data)).catch(err => console.error("Error fetching notifications:", err)); };
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        if (!user) return;
        socketService.connect();
        socketService.on('task_updated', (data) => {
            if (data.updatedBy !== user.id) {
                fetchDataForWorkspace();
            }
        });
        socketService.on('user_assigned_to_task', (data) => {
            if (data.assignedUserId === user.id) {
                if (Notification.permission === 'granted') {
                    const notification = new Notification('Nueva Tarea Asignada', {
                        body: `${data.actorName} te asignó la tarea: "${data.taskTitle}"`,
                    });
                }
            }
        });
        return () => {
            socketService.disconnect();
        };
    }, [fetchDataForWorkspace, user]);
    
    const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

    const handleToggleNotifications = () => {
        setIsNotificationsOpen(prev => !prev);
        if (unreadCount > 0 && !isNotificationsOpen) {
            markNotificationsAsRead().then(() => setNotifications(prev => prev.map(n => ({ ...n, isRead: 1 })))).catch(err => console.error("Failed to mark notifications as read", err));
        }
    };
    
    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWorkspaceName.trim()) return;
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
        setSelectedTask(task as Task | null);
        if (!task) {
            setListIdForNewTask(listId);
            setParentIdForNewTask(parentId);
        }
        setIsTaskModalOpen(true);
    };

    const handleNotificationClick = (taskId: string) => {
        const taskToOpen = allTasks.find(task => task.id === taskId);
        if (taskToOpen) {
            handleOpenTaskModal(taskToOpen, taskToOpen.listId);
            setIsNotificationsOpen(false);
        } else {
            alert("La tarea no se encontró en el espacio de trabajo actual.");
        }
    };

    const handleCloseTaskModal = () => {
        setIsTaskModalOpen(false); setSelectedTask(null); setListIdForNewTask(null); setParentIdForNewTask(undefined);
    };
    
    const handleDataNeedsRefresh = () => { fetchDataForWorkspace(); };
    
    const handleTaskUpdated = (updatedTask: any) => { fetchDataForWorkspace(); };
    
    const handleFilterChange = (filterName: string, value: string) => { setActiveFilters(prev => ({ ...prev, [filterName]: value })); };

    const tasksToDisplay = searchResults !== null ? searchResults : allTasks;
    const statusField = useMemo(() => customFields.find(f => f.name.toLowerCase() === 'estado'), [customFields]);
    const statusOptions = useMemo(() => (statusField ? [...(fieldOptions[statusField.id] || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)) : []), [statusField, fieldOptions]);
    
    const filteredTasks = useMemo(() => {
        let tasksToProcess = tasksToDisplay.filter(task => {
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

        if (hideDoneTasks && statusField && statusOptions.length > 0) {
            const doneStatusId = statusOptions[statusOptions.length - 1].id;
            tasksToProcess = tasksToProcess.filter(task => {
                const taskStatusId = task.customFields?.[statusField.id]?.optionId;
                return taskStatusId !== doneStatusId;
            });
        }
        
        return tasksToProcess;
    }, [tasksToDisplay, activeFilters, statusField, statusOptions, hideDoneTasks]);

    const renderCurrentView = () => {
        switch(currentView) {
            case 'board':
                return <BoardView tasks={filteredTasks} statusField={statusField} statusOptions={statusOptions} customFields={customFields} onOpenTask={handleOpenTaskModal} onDataNeedsRefresh={handleDataNeedsRefresh} />;
            case 'calendar':
                return <CalendarView tasks={filteredTasks} onOpenTask={handleOpenTaskModal} onDataNeedsRefresh={handleDataNeedsRefresh} />;
            case 'list':
            default:
                return <TaskGrid tasks={filteredTasks} customFields={customFields} fieldOptions={fieldOptions} onOpenTask={handleOpenTaskModal} onTaskUpdate={handleTaskUpdated} groupBy={groupBy} allUsers={workspaceMembers} statusOptions={statusOptions} statusField={statusField} />;
        }
    };

    if (loadingWorkspaces) { return <div className="flex justify-center items-center h-screen">Cargando...</div>; }

    return (
        <div className="flex h-screen bg-white text-gray-800">
            <TaskModal isOpen={isTaskModalOpen} onClose={handleCloseTaskModal} listId={selectedTask?.listId || listIdForNewTask} parentId={parentIdForNewTask} taskToEdit={selectedTask} onTaskCreated={handleDataNeedsRefresh} onDataNeedsRefresh={handleDataNeedsRefresh} customFields={customFields} workspaceMembers={workspaceMembers} allWorkspaceTasks={allTasks} />
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
                    <ul>{workspaces.map((ws) => (<li key={ws.id}><a href="#" onClick={(e) => { e.preventDefault(); setActiveWorkspace(ws); }} className={`block py-2 px-3 rounded font-medium ${activeWorkspace?.id === ws.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`}>{ws.name}</a></li>))}</ul>
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
                                <div className="mt-2 flex items-center border-b"><button onClick={() => setCurrentView('list')} className={`py-2 px-3 text-sm font-semibold ${currentView === 'list' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Lista</button><button onClick={() => setCurrentView('board')} className={`py-2 px-3 text-sm font-semibold ${currentView === 'board' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Tablero</button><button onClick={() => setCurrentView('calendar')} className={`py-2 px-3 text-sm font-semibold ${currentView === 'calendar' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Calendario</button></div>
                            </div>
                            <div className="flex items-center gap-4">
                                <input type="text" placeholder="Buscar tareas..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="p-2 border rounded-md" />
                                <div><label htmlFor="groupBy-select" className="text-xs font-semibold text-gray-500">AGRUPAR</label><select id="groupBy-select" value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupByOption)} className="ml-2 p-1 border-gray-300 rounded-md text-sm bg-white"><option value="default">Por defecto</option><option value="priority">Prioridad</option><option value="dueDate">Fecha Límite</option><option value="assignee">Asignado</option><option value="status">Estado</option></select></div>
                                
                                {statusField && (<div><label htmlFor="status-filter" className="text-xs font-semibold text-gray-500">ESTADO</label><select id="status-filter" value={activeFilters.statusId} onChange={(e) => handleFilterChange('statusId', e.target.value)} className="ml-2 p-1 border-gray-300 rounded-md text-sm bg-white"><option value="all">Todos</option>{statusOptions.map(option => (<option key={option.id} value={option.id}>{option.value}</option>))}</select></div>)}
                                <div><label htmlFor="assignee-filter" className="text-xs font-semibold text-gray-500">ASIGNADO</label><select id="assignee-filter" value={activeFilters.assigneeId} onChange={(e) => handleFilterChange('assigneeId', e.target.value)} className="ml-2 p-1 border-gray-300 rounded-md text-sm bg-white"><option value="all">Todos</option>{workspaceMembers.map(member => (<option key={member.id} value={member.id}>{member.name}</option>))}</select></div>
                                
                                <div className="flex items-center"><input type="checkbox" id="hide-done" checked={hideDoneTasks} onChange={e => setHideDoneTasks(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/><label htmlFor="hide-done" className="ml-2 block text-sm text-gray-900">Ocultar Finalizadas</label></div>
                                <button onClick={() => handleOpenTaskModal(null, lists[0]?.id)} className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow font-semibold hover:bg-blue-700 disabled:bg-blue-300" disabled={lists.length === 0} title={lists.length === 0 ? "Crea una lista primero" : "Añadir nueva tarea"}>+ Añadir Tarea</button>
                                <div className="relative">
                                    <button onClick={handleToggleNotifications} className="relative p-2 rounded-full hover:bg-gray-100">
                                        {/* --- CÓDIGO DEL ÍCONO CORREGIDO --- */}
                                        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V5a1 1 0 10-2 0v.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                                        {unreadCount > 0 && (<span className="absolute top-1 right-1 block h-3 w-3 rounded-full bg-red-500 border-2 border-white"></span>)}
                                    </button>
                                    {isNotificationsOpen && (<NotificationsPanel notifications={notifications} onClose={() => setIsNotificationsOpen(false)} onNotificationClick={handleNotificationClick} />)}
                                </div>
                            </div>
                        </div>
                        <div className="flex-grow overflow-y-auto">
                        {loadingData || isSearching ? ( <div className="text-center p-10">Cargando datos...</div> ) : renderCurrentView()}
                        </div>
                    </>
                ) : (
                    <div className="text-center my-auto"><h2 className="text-2xl font-semibold">¡Bienvenido a Stratopia!</h2><p className="text-gray-500 mt-2">Selecciona un espacio de trabajo o crea uno nuevo para comenzar.</p></div>
                )}
            </main>
        </div>
    );
};

export default DashboardPage;