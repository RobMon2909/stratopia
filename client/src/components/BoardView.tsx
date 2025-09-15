// src/components/BoardView.tsx

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder } from '@hello-pangea/dnd';
import type { Task, CustomField, FieldOption } from '../types';
import TaskCard from './TaskCard.tsx';
import { updateTask } from '../services/api.ts';

interface BoardViewProps {
    tasks: Task[];
    statusField: CustomField | undefined;
    statusOptions: FieldOption[];
    customFields: CustomField[];
    onOpenTask: (task: Task, listId: string) => void;
    onDataNeedsRefresh: () => void;
}

const BoardView: React.FC<BoardViewProps> = ({ tasks, statusField, statusOptions, onOpenTask, onDataNeedsRefresh }) => {
    type ColumnMap = { [key: string]: { name: string; color: string; items: Task[] } };
    const [columns, setColumns] = useState<ColumnMap>({});

    useEffect(() => {
        if (!statusField || !statusOptions) {
            setColumns({});
            return;
        }

        const newColumns: ColumnMap = {};
        const sortedOptions = [...statusOptions].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        sortedOptions.forEach(option => {
            newColumns[option.id] = { name: option.value, color: option.color || '#cccccc', items: [] };
        });
        
        const unassignedColumnId = 'unassigned';
        newColumns[unassignedColumnId] = { name: "Sin Estado", color: '#9CA3AF', items: [] };

        tasks.forEach(task => {
            const statusValue = task.customFields?.[statusField.id];
            let statusOptionId: string | null = null;

            if (statusValue) {
                if (statusField.type === 'labels' && statusValue.optionIds && statusValue.optionIds.length > 0) {
                    statusOptionId = statusValue.optionIds[0];
                } else if (statusField.type === 'dropdown' && statusValue.optionId) {
                    statusOptionId = statusValue.optionId;
                }
            }

            if (statusOptionId && newColumns[statusOptionId]) {
                newColumns[statusOptionId].items.push(task);
            } else {
                 newColumns[unassignedColumnId].items.push(task);
            }
        });
        
        if (newColumns[unassignedColumnId].items.length === 0) {
            delete newColumns[unassignedColumnId];
        }

        setColumns(newColumns);
    }, [tasks, statusField, statusOptions]);

    const onDragEnd: OnDragEndResponder = (result) => {
        if (!result.destination || !statusField) return;
        const { source, destination, draggableId } = result;

        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }

        const startColumn = columns[source.droppableId];
        const endColumn = columns[destination.droppableId];
        
        const originalColumns = JSON.parse(JSON.stringify(columns));

        const startItems = [...startColumn.items];
        const [movedTask] = startItems.splice(source.index, 1);
        
        if (startColumn === endColumn) {
            startItems.splice(destination.index, 0, movedTask);
            const newColumn = { ...startColumn, items: startItems };
            setColumns(prev => ({ ...prev, [source.droppableId]: newColumn }));
        } else {
            const endItems = [...endColumn.items];
            endItems.splice(destination.index, 0, movedTask);
            setColumns(prev => ({
                ...prev,
                [source.droppableId]: { ...startColumn, items: startItems },
                [destination.droppableId]: { ...endColumn, items: endItems },
            }));
        }

        const taskToUpdate = tasks.find(t => t.id === draggableId);
        if (!taskToUpdate) return;
        
        // --- INICIO DE LA CORRECCIÓN DE TIPOS ---

        // 1. Definimos un tipo para el payload de un campo personalizado para mayor claridad.
        type CustomFieldPayload = {
            fieldId: string;
            valueId?: string;
            value?: any;
            optionId?: string;
            optionIds?: string[];
        };

        // 2. Mapeamos los campos personalizados existentes, EXCLUYENDO el de estado.
        const existingFieldsPayload: CustomFieldPayload[] = Object.entries(taskToUpdate.customFields || {})
            .filter(([fieldId]) => fieldId !== statusField.id)
            .map(([fieldId, data]) => ({
                fieldId: fieldId,
                valueId: data.valueId,
                value: data.value,
                optionId: data.optionId || undefined,
                optionIds: data.optionIds || undefined,
            }));
        
        // 3. Creamos el nuevo payload para el campo de estado de forma segura.
        const newStatusOptionId = destination.droppableId;
        const newStatusPayload: CustomFieldPayload = {
            fieldId: statusField.id
        };

        if (statusField.type === 'labels') {
            newStatusPayload.optionIds = [newStatusOptionId];
        } else { // 'dropdown' u otros
            newStatusPayload.optionId = newStatusOptionId;
        }

        // 4. Combinamos los campos existentes con el campo de estado actualizado.
        const finalCustomFieldsPayload = [...existingFieldsPayload, newStatusPayload];
        
 // --- AÑADE ESTA LÍNEA AQUÍ ---
        console.log("Enviando a la API updateTask:", { taskId: draggableId, customFields: finalCustomFieldsPayload });
        // --- FIN DE LA LÍNEA A AÑADIR ---

        // --- FIN DE LA CORRECCIÓN DE TIPOS ---

        updateTask({ taskId: draggableId, customFields: finalCustomFieldsPayload })
            .then(() => {
                console.log("Tarea actualizada con éxito!");
                onDataNeedsRefresh();
            })
            .catch(err => {
                console.error("Fallo al actualizar el estado de la tarea:", err);
                alert("No se pudo mover la tarea. El cambio se revertirá.");
                setColumns(originalColumns);
            });
    };

    if (!statusField) {
        return <div className="p-8 text-center text-foreground-secondary bg-background-primary rounded-lg">Para usar la vista de tablero, crea un campo personalizado de tipo **dropdown** o **labels** llamado **"Estado"**.</div>;
    }

    return (
        <div className="flex gap-4 overflow-x-auto p-2 h-full">
        <DragDropContext onDragEnd={onDragEnd}>
            {Object.entries(columns).map(([columnId, column]) => (
                    <div key={columnId} className="w-72 bg-background-secondary rounded-lg flex flex-col flex-shrink-0 h-full">
                    <div className="p-3 font-semibold text-sm border-b-2" style={{ borderBottomColor: column.color }}>
                            <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: column.color + '30', color: column.color }}>{column.name}</span>
                            <span className="ml-2 text-gray-500">{column.items.length}</span>
                        </div>
                         <Droppable droppableId={columnId}>
                        {(provided, snapshot) => (
                            <div 
                                {...provided.droppableProps} 
                                ref={provided.innerRef} 
                                className={`p-3 flex-grow min-h-[100px] rounded-b-lg transition-colors duration-300 ${snapshot.isDraggingOver ? 'bg-blue-100' : ''}`}
                            >
                                {column.items.map((item, index) => (
                                    <Draggable key={item.id} draggableId={item.id} index={index}>
                                        {(provided) => (
                                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="mb-2">
                                                <TaskCard task={item} onClick={() => onOpenTask(item, item.listId)} />
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </div>
            ))}
        </DragDropContext>
    </div>
);
};

export default BoardView;