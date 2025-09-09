import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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

const BoardView: React.FC<BoardViewProps> = ({ tasks, statusField, statusOptions, customFields, onOpenTask, onDataNeedsRefresh }) => {
    const [columns, setColumns] = useState<any>({});

    useEffect(() => {
        if (!statusField || !statusOptions) {
            setColumns({});
            return;
        }

        const newColumns: { [key: string]: { name: string; color: string; items: Task[] } } = {};
        const sortedOptions = [...statusOptions].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        sortedOptions.forEach(option => {
            newColumns[option.id] = { name: option.value, color: option.color, items: [] };
        });

        tasks.forEach(task => {
            const statusValue = task.customFields?.[statusField.id];
            let statusOptionId: string | null | undefined = null;

            if (statusValue) {
                if (statusField.type === 'labels' && statusValue.optionIds && statusValue.optionIds.length > 0) {
                    statusOptionId = statusValue.optionIds[0];
                } else if (statusField.type === 'dropdown') {
                    statusOptionId = statusValue.optionId;
                }
            }

            if (statusOptionId && newColumns[statusOptionId]) {
                newColumns[statusOptionId].items.push(task);
            }
        });
        setColumns(newColumns);
    }, [tasks, statusField, statusOptions]);

    const onDragEnd = (result: any) => {
        if (!result.destination || !statusField) return;
        const { source, destination, draggableId } = result;

        if (source.droppableId !== destination.droppableId) {
            const sourceColumn = columns[source.droppableId];
            const destColumn = columns[destination.droppableId];
            const sourceItems = [...sourceColumn.items];
            const [movedTask] = sourceItems.splice(source.index, 1);
            const destItems = [...destColumn.items];
            destItems.splice(destination.index, 0, movedTask);
            
            setColumns({
                ...columns,
                [source.droppableId]: { ...sourceColumn, items: sourceItems },
                [destination.droppableId]: { ...destColumn, items: destItems },
            });
            
            const newOptionId = destination.droppableId;
            const newOptionValue = destColumn.name;
            const taskToUpdate = tasks.find(t => t.id === draggableId);
            const currentCustomFields = taskToUpdate?.customFields || {};
            
            const otherFieldsPayload = Object.entries(currentCustomFields)
                .filter(([fieldId]) => fieldId !== statusField.id)
                .map(([fieldId, data]) => ({
                    fieldId, value: data.value, optionId: data.optionId,
                    optionIds: data.optionIds, type: customFields.find(f => f.id === fieldId)?.type, valueId: data.valueId
                }));

            const statusFieldPayload = {
                fieldId: statusField.id,
                value: newOptionValue,
                optionId: newOptionId,
                type: statusField.type
            };

            const finalPayload = {
                taskId: draggableId,
                customFields: [statusFieldPayload, ...otherFieldsPayload]
            };
            
            updateTask(finalPayload)
                .catch(err => {
                    console.error("Failed to update task status", err);
                    alert("No se pudo mover la tarea.");
                })
                .finally(() => {
                    onDataNeedsRefresh();
                });
        }
    };

    if (!statusField) {
        return <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">Para usar la vista de tablero, crea un campo personalizado de tipo **dropdown** o **labels** llamado **"Estado"**.</div>;
    }

    return (
        <div className="flex gap-4 overflow-x-auto p-2 h-full">
            <DragDropContext onDragEnd={onDragEnd}>
                {Object.entries(columns).map(([columnId, column]: [string, any]) => (
                    <div key={columnId} className="w-72 bg-gray-100 rounded-lg flex flex-col flex-shrink-0 h-full">
                        <div className="p-3 font-semibold text-sm border-b-2" style={{ borderBottomColor: column.color }}>
                            <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: column.color + '30', color: column.color }}>{column.name}</span>
                            <span className="ml-2 text-gray-500">{column.items.length}</span>
                        </div>
                        <Droppable droppableId={columnId}>
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="p-3 flex-grow min-h-[100px]">
                                    {column.items.map((item: Task, index: number) => (
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