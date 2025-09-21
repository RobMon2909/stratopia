// client/src/pages/DashboardPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
    getWorkspaces, createWorkspace, getWorkspaceLists, getCustomFields, 
    getFieldOptions, getWorkspaceMembers, searchTasks, 
    getNotifications, markNotificationsAsRead,
    updateTask 
} from '@/services/api';
import socketService from '@/services/socketService';
import NotificationsPanel from '@/components/NotificationsPanel';
import type { Notification } from '@/components/NotificationsPanel';
import { useAuth } from '@/hooks/useAuth';
import type { Task, List, Workspace, CustomField, FieldOption, User, NestedTask } from '@/types';
import TaskModal from '@/components/TaskModal';
import TaskGrid from '@/components/TaskGrid';
import BoardView from '@/components/BoardView';
import CalendarView from '@/components/CalendarView';
import { useDebounce } from '@/hooks/useDebounce';
import { NotificationsButton } from '@/components/NotificationsButton';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

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

    useEffect(() => { localStorage.setItem('hideDoneTasks', String(hideDoneTasks)); }, [hideDoneTasks]);

    const allTasks = useMemo(() => (Array.isArray(lists) ? lists.reduce((acc, list) => [...acc, ...(list.tasks || [])], [] as Task[]) : []), [lists]);
    const unreadCount = useMemo(() => (Array.isArray(notifications) ? notifications.filter(n => !n.isRead).length : 0), [notifications]);

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
            const optionsToFetch = Array.isArray(fieldsRes.data) ? fieldsRes.data.filter((f: CustomField) => f.type === 'dropdown' || f.type === 'labels') : [];
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

    useEffect(() => { if (activeWorkspace) { fetchDataForWorkspace(); } }, [activeWorkspace, fetchDataForWorkspace]);

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
        if (!user || !activeWorkspace) return;
        socketService.connect();
        socketService.on('task_updated', (data) => {
            if (data.updatedBy !== user.id) {
                fetchDataForWorkspace();
            }
        });
        return () => { socketService.disconnect(); };
    }, [user, activeWorkspace, fetchDataForWorkspace]);
    
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
    
    const handleTaskUpdated = (updatedTaskData: Partial<Task> & { id: string }) => {
        // --- SOLUCIÓN: Lógica de actualización no-destructiva ---
        // 1. Actualización visual optimista (el usuario ve el cambio al instante)
        setLists(currentLists =>
            currentLists.map(list => ({
                ...list,
                tasks: list.tasks.map(task => {
                    if (task.id === updatedTaskData.id) {
                        const newCustomFields = updatedTaskData.customFields
                            ? { ...task.customFields, ...updatedTaskData.customFields }
                            : task.customFields;
                        
                        return { ...task, ...updatedTaskData, customFields: newCustomFields };
                    }
                    return task;
                }),
            }))
        );

        // 2. Construye el payload para la API SÓLO con los datos que cambiaron
        const { id, customFields: cfObject, assignees, ...restOfTaskData } = updatedTaskData;

        const customFieldsPayload = cfObject 
            ? Object.entries(cfObject).map(([fieldId, data]) => ({ fieldId, ...data }))
            : undefined;

        const assigneeIdsPayload = assignees ? assignees.map(a => a.id) : undefined;
        
        const payload: any = { // Se usa 'any' temporalmente para poder modificar description
            taskId: id,
            ...restOfTaskData,
            customFields: customFieldsPayload,
            assigneeIds: assigneeIdsPayload,
        };

        // --- SOLUCIÓN: Corrige el error de TypeScript `string | null` vs `string | undefined` ---
        if ('description' in payload) {
            payload.description = payload.description ?? undefined;
        }

        // 3. Llamada a la API con el payload parcial y correcto
        updateTask(payload).catch(error => {
            console.error("Falló la actualización de la tarea:", error.response?.data || error);
            alert("Error al guardar el cambio. Se revertirá la acción.");
            fetchDataForWorkspace();
        });
    };
    
    const handleFilterChange = (filterName: string, value: string) => { setActiveFilters(prev => ({ ...prev, [filterName]: value })); };
    
    const tasksToDisplay = searchResults !== null ? searchResults : allTasks;
    const statusField = useMemo(() => customFields.find(f => f.name.toLowerCase() === 'estado'), [customFields]);
    const statusOptions = useMemo(() => (statusField ? [...(fieldOptions[statusField.id] || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)) : []), [statusField, fieldOptions]);
    
    const filteredTasks = useMemo(() => {
        if (!Array.isArray(tasksToDisplay)) return [];
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

    const handleTasksReorder = (reorderedTasks: Task[]) => {
        const reorderedTasksMap = new Map(reorderedTasks.map(task => [task.id, task]));
        const newAllTasks = allTasks.map(task => reorderedTasksMap.get(task.id) || task);
        setLists(currentLists =>
            currentLists.map(list => ({
                ...list,
                tasks: newAllTasks.filter(task => task.listId === list.id),
            }))
        );
    };

    const renderCurrentView = () => {
        switch(currentView) {
            case 'board':
                return <BoardView tasks={filteredTasks} statusField={statusField} statusOptions={statusOptions} customFields={customFields} onOpenTask={handleOpenTaskModal} onDataNeedsRefresh={handleDataNeedsRefresh} />;
            case 'calendar':
                return <CalendarView tasks={filteredTasks} onOpenTask={handleOpenTaskModal} onDataNeedsRefresh={handleDataNeedsRefresh} />;
            case 'list':
            default:
                return <TaskGrid 
                    tasks={filteredTasks} 
                    customFields={customFields} 
                    fieldOptions={fieldOptions} 
                    onOpenTask={handleOpenTaskModal} 
                    onTaskUpdate={handleTaskUpdated} 
                    allUsers={workspaceMembers}
                    onTasksReorder={handleTasksReorder} 
                />;
        }
    };
    
    if (loadingWorkspaces) { return <div className="flex justify-center items-center h-screen">Cargando...</div>; }

    return (
        <div className="flex h-screen bg-background-primary text-foreground-primary">
            <TaskModal isOpen={isTaskModalOpen} onClose={handleCloseTaskModal} listId={selectedTask?.listId || listIdForNewTask} parentId={parentIdForNewTask} taskToEdit={selectedTask} onTaskCreated={handleDataNeedsRefresh} onDataNeedsRefresh={handleDataNeedsRefresh} customFields={customFields} workspaceMembers={workspaceMembers} allWorkspaceTasks={allTasks} />
            {isWorkspaceModalOpen && ( <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={() => setIsWorkspaceModalOpen(false)}> <div className="bg-background-secondary p-6 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}> <h2 className="text-2xl font-bold mb-4">Crear Nuevo Espacio</h2> <form onSubmit={handleCreateWorkspace}> <input type="text" value={newWorkspaceName} onChange={(e) => setNewWorkspaceName(e.target.value)} placeholder="Nombre del espacio..." className="w-full p-2 border border-border-color rounded mb-4 bg-background-primary" autoFocus /> <div className="flex justify-end gap-4"> <button type="button" onClick={() => setIsWorkspaceModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded" disabled={isSubmittingWorkspace}>Cancelar</button> <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={isSubmittingWorkspace}>{isSubmittingWorkspace ? 'Creando...' : 'Crear'}</button> </div> </form> </div> </div> )}
            <aside className="w-64 bg-background-secondary p-5 border-r border-border-color flex flex-col flex-shrink-0">
                <div className="flex justify-between items-center mb-6"> <h1 className="text-2xl font-bold text-blue-600">Stratopia</h1> <ThemeToggleButton /> </div>
                <div className="flex justify-between items-center mb-2"> <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Espacios</h2> {user?.role === 'ADMIN' && (<button onClick={() => setIsWorkspaceModalOpen(true)} className="text-blue-500 hover:text-blue-700">+</button>)} </div>
                <nav className="flex-grow"> <ul>{Array.isArray(workspaces) && workspaces.map((ws) => (<li key={ws.id}><a
                        href="#"
                        onClick={(e) => { e.preventDefault(); setActiveWorkspace(ws); }}
                        className={`block py-2 px-3 rounded-md font-medium transition-colors ${
                            activeWorkspace?.id === ws.id
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-foreground-secondary hover:bg-blue-100 hover:text-blue-700'
                        }`}
                    >
                        {ws.name}
                    </a></li>))}</ul> </nav>
                {user?.role === 'ADMIN' && (<div className="mt-4 pt-4 border-t border-border-color"><Link to="/admin" className="block py-2 px-3 rounded text-sm font-semibold hover:bg-gray-100">Panel de Administrador</Link></div>)}
                 <div className="mt-auto pt-4 border-t border-border-color"> <p className="text-sm font-medium">{user?.name}</p> <p className="text-xs text-foreground-secondary mb-2">{user?.email}</p> <div className="space-y-2 mt-2"> <NotificationsButton /> <button onClick={logout} className="text-sm text-red-500 hover:underline">Logout</button> </div> </div>
            </aside>
            <main className="flex-1 p-6 lg:p-8 flex flex-col overflow-y-hidden">
                {activeWorkspace ? (
                    <>
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <div>
                                <h1 className="text-4xl font-bold">{activeWorkspace.name}</h1>
                                <div className="mt-2 flex items-center border-b border-border-color"><button onClick={() => setCurrentView('list')} className={`py-2 px-3 text-sm font-semibold ${currentView === 'list' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-foreground-secondary'}`}>Lista</button><button onClick={() => setCurrentView('board')} className={`py-2 px-3 text-sm font-semibold ${currentView === 'board' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-foreground-secondary'}`}>Tablero</button><button onClick={() => setCurrentView('calendar')} className={`py-2 px-3 text-sm font-semibold ${currentView === 'calendar' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-foreground-secondary'}`}>Calendario</button></div>
                            </div>
                            <div className="flex items-center gap-4">
                                <input type="text" placeholder="Buscar tareas..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="p-2 border border-border-color rounded-md bg-background-secondary" />
                                <div><label htmlFor="groupBy-select" className="text-xs font-semibold text-foreground-secondary">AGRUPAR</label><select id="groupBy-select" value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupByOption)} className="ml-2 p-1 border-border-color rounded-md text-sm bg-background-secondary"><option value="default">Por defecto</option><option value="priority">Prioridad</option><option value="dueDate">Fecha Límite</option><option value="assignee">Asignado</option><option value="status">Estado</option></select></div>
                                {statusField && (<div><label htmlFor="status-filter" className="text-xs font-semibold text-foreground-secondary">ESTADO</label><select id="status-filter" value={activeFilters.statusId} onChange={(e) => handleFilterChange('statusId', e.target.value)} className="ml-2 p-1 border-border-color rounded-md text-sm bg-background-secondary"><option value="all">Todos</option>{statusOptions.map(option => (<option key={option.id} value={option.id}>{option.value}</option>))}</select></div>)}
                                <div><label htmlFor="assignee-filter" className="text-xs font-semibold text-foreground-secondary">ASIGNADO</label><select id="assignee-filter" value={activeFilters.assigneeId} onChange={(e) => handleFilterChange('assigneeId', e.target.value)} className="ml-2 p-1 border-border-color rounded-md text-sm bg-background-secondary"><option value="all">Todos</option>{workspaceMembers.map(member => (<option key={member.id} value={member.id}>{member.name}</option>))}</select></div>
                                <div className="flex items-center"><input type="checkbox" id="hide-done" checked={hideDoneTasks} onChange={e => setHideDoneTasks(e.target.checked)} className="h-4 w-4 rounded border-border-color text-blue-600 focus:ring-blue-500"/><label htmlFor="hide-done" className="ml-2 block text-sm">Ocultar Finalizadas</label></div>
                                <button onClick={() => handleOpenTaskModal(null, Array.isArray(lists) && lists.length > 0 ? lists[0].id : '', undefined)} className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow font-semibold hover:bg-blue-700 disabled:bg-blue-300" disabled={!Array.isArray(lists) || lists.length === 0} title={!Array.isArray(lists) || lists.length === 0 ? "Crea una lista primero" : "Añadir nueva tarea"}>+ Añadir Tarea</button>
                                <div className="relative">
                                    <button onClick={handleToggleNotifications} className="relative p-2 rounded-full hover:bg-background-secondary">
                                        <svg className="w-6 h-6 text-foreground-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V5a1 1 0 10-2 0v.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                                        {unreadCount > 0 && (<span className="absolute top-1 right-1 block h-3 w-3 rounded-full bg-red-500 border-2 border-white"></span>)}
                                    </button>
                                    {isNotificationsOpen && (<NotificationsPanel notifications={notifications} onClose={() => setIsNotificationsOpen(false)} onNotificationClick={handleNotificationClick} />)}
                                </div>
                            </div>
                        </div>
                        <div className="flex-grow overflow-y-auto mt-4 bg-background-secondary p-4 rounded-lg">
                        {loadingData || isSearching ? ( <div className="text-center p-10">Cargando datos...</div> ) : renderCurrentView()}
                        </div>
                    </>
                ) : (
                    <div className="text-center my-auto">
                        <h2 className="text-2xl font-semibold">¡Bienvenido a Stratopia!</h2>
                        <p className="text-foreground-secondary mt-2">Selecciona un espacio de trabajo o crea uno nuevo para comenzar.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default DashboardPage;