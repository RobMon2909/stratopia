// client/src/components/TaskGrid.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder } from '@hello-pangea/dnd';
import { useReactTable, getCoreRowModel, flexRender, ColumnDef, ColumnSizingState, Header } from '@tanstack/react-table';
import type { Task, CustomField, FieldOption, NestedTask, User } from '../types';
import TaskRow from './TaskRow';
import { nestTasks } from '../utils/taskUtils';

interface TaskGridProps {
    tasks: Task[];
    customFields: CustomField[];
    fieldOptions: { [fieldId: string]: FieldOption[] };
    onOpenTask: (task: Task | null, listId: string, parentId?: string) => void;
    onTaskUpdate: (updatedTask: Partial<Task> & { id: string }) => void;
    allUsers: User[];
}

const DraggableHeader: React.FC<{ header: Header<NestedTask, unknown> }> = ({ header }) => {
    return (
        <div 
            className="px-6 py-3 relative group flex items-center justify-between font-bold" // Títulos en negritas
            style={{ width: header.getSize() }}
        >
            {flexRender(header.column.columnDef.header, header.getContext())}
            <div
                onMouseDown={(e) => {
                    e.stopPropagation(); // Evita que el drag se active al redimensionar
                    header.getResizeHandler()(e);
                }}
                onTouchStart={(e) => {
                    e.stopPropagation(); // Soporte para táctil
                    header.getResizeHandler()(e);
                }}
                className={`absolute right-0 top-0 h-full w-1.5 bg-blue-400 opacity-0 group-hover:opacity-100 cursor-col-resize select-none touch-none`}
            />
        </div>
    );
};

const TaskGrid: React.FC<TaskGridProps> = ({ tasks, customFields, fieldOptions, onOpenTask, onTaskUpdate, allUsers }) => {
    
    const nestedTasks = useMemo(() => nestTasks(Array.isArray(tasks) ? tasks : []), [tasks]);

    const columns = useMemo<ColumnDef<NestedTask>[]>(() => [
        { id: 'title', header: 'Nombre de Tarea', size: 350, accessorFn: (row: NestedTask) => row.title },
        { id: 'dueDate', header: 'Fecha Límite', size: 150, accessorFn: (row: NestedTask) => row.dueDate },
        { id: 'assignees', header: 'Asignado', size: 150, accessorFn: (row: NestedTask) => row.assignees },
        ...customFields
            // --- Filtra y excluye el campo "Documentos" ---
            .filter(field => field.name.toLowerCase() !== 'documentos')
            .map(field => ({
                id: field.id,
                header: field.name,
                size: 150,
                accessorFn: (row: NestedTask) => row.customFields?.[field.id],
            })),
    ], [customFields]);

    const columnIds = useMemo(() => columns.map(c => c.id!), [columns]);

    const [columnOrder, setColumnOrder] = useState<string[]>(() => {
        const savedOrder = localStorage.getItem('taskGridColumnOrder');
        return savedOrder ? JSON.parse(savedOrder) : columnIds;
    });

    const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() => {
        const savedSizing = localStorage.getItem('taskGridColumnSizing');
        return savedSizing ? JSON.parse(savedSizing) : {};
    });

    useEffect(() => { localStorage.setItem('taskGridColumnOrder', JSON.stringify(columnOrder)); }, [columnOrder]);
    useEffect(() => { localStorage.setItem('taskGridColumnSizing', JSON.stringify(columnSizing)); }, [columnSizing]);
    
    const table = useReactTable({
        data: nestedTasks,
        columns,
        getCoreRowModel: getCoreRowModel(),
        state: { columnOrder, columnSizing },
        onColumnOrderChange: setColumnOrder,
        onColumnSizingChange: setColumnSizing,
        columnResizeMode: 'onChange',
    });

    const onDragEnd: OnDragEndResponder = (result) => {
        if (!result.destination) return;
        const newOrder = Array.from(columnOrder);
        const [removed] = newOrder.splice(result.source.index, 1);
        newOrder.splice(result.destination.index, 0, removed);
        setColumnOrder(newOrder);
    };

    if (tasks.length === 0) {
        return <div className="text-center p-10">No hay tareas que coincidan o no has creado ninguna.</div>;
    }

    const gridTemplateColumns = useMemo(
        () => table.getHeaderGroups()[0].headers.map(h => `${h.getSize()}px`).join(' '),
        [table.getHeaderGroups()[0].headers]
    );

    return (
        <div className="w-full text-sm text-left text-foreground-secondary bg-card rounded-lg shadow-md">
            <div className="text-xs text-foreground-primary uppercase bg-background-secondary sticky top-0 z-10 border-b border-border">
                {table.getHeaderGroups().map(headerGroup => (
                    <DragDropContext onDragEnd={onDragEnd} key={headerGroup.id}>
                        <Droppable droppableId="droppable-headers" direction="horizontal">
                            {(provided) => (
                                <div className="flex" ref={provided.innerRef} {...provided.droppableProps}>
                                    {headerGroup.headers.map(header => (
                                        <Draggable key={header.id} draggableId={header.id} index={header.index}>
                                            {(provided) => (
                                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                                    <DraggableHeader header={header} />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                ))}
            </div>

            <div>
                {table.getRowModel().rows.map(row => (
                    <TaskRow
                        key={row.original.id}
                        task={row.original}
                        gridTemplateColumns={gridTemplateColumns}
                        cells={row.getVisibleCells()}
                        customFields={customFields}
                        fieldOptions={fieldOptions}
                        onOpenTask={onOpenTask}
                        onTaskUpdate={onTaskUpdate}
                        level={0}
                        allUsers={allUsers}
                    />
                ))}
            </div>
        </div>
    );
};

export default TaskGrid;