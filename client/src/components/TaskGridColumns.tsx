// client/src/components/TaskGridColumns.tsx
import { ColumnDef } from '@tanstack/react-table';
import type { NestedTask, CustomField, FieldOption } from '../types';
import StatusCircle from './ui/StatusCircle';
import Avatar from './ui/Avatar';
import Tag from './ui/Tag';

// Esta función crea las definiciones de las columnas dinámicamente
export const getTaskGridColumns = (
    customFields: CustomField[], 
    fieldOptions: { [fieldId: string]: FieldOption[] },
    onOpenTask: (taskId: string, listId: string) => void
): ColumnDef<NestedTask>[] => {

    const priorityField = customFields.find(f => f.name.toLowerCase() === 'prioridad');
    const statusField = customFields.find(f => f.name.toLowerCase() === 'estado');
    const otherCustomFields = customFields.filter(f => 
        f.name.toLowerCase() !== 'prioridad' && f.name.toLowerCase() !== 'estado'
    );

    const columns: ColumnDef<NestedTask>[] = [
        {
            id: 'title',
            header: 'Nombre de Tarea',
            size: 450, // Ancho inicial
            cell: ({ row }) => {
                const task = row.original;
                let statusName = 'Pendiente';
                let statusColor = '#6B7280';

                if (statusField && task.customFields?.[statusField.id]?.optionId) {
                    const option = (fieldOptions[statusField.id] || []).find(opt => opt.id === task.customFields[statusField.id].optionId);
                    if (option) {
                        statusName = option.value;
                        statusColor = option.color;
                    }
                }

                return (
                    <div 
                        className="flex items-center gap-2" 
                        style={{ paddingLeft: `${row.depth * 24}px` }} // Indentación para subtareas
                    >
                        {/* Flecha para expandir/contraer subtareas */}
                        {row.getCanExpand() && (
                            <button onClick={row.getToggleExpandedHandler()} className="p-0.5 rounded-full hover:bg-muted">
                                <svg className={`w-4 h-4 text-foreground-secondary transition-transform ${row.getIsExpanded() ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                            </button>
                        )}
                        <StatusCircle statusName={statusName} color={statusColor} />
                        <span 
                            className="font-medium text-foreground-primary cursor-pointer hover:underline"
                            onClick={() => onOpenTask(task.id, task.listId)}
                        >
                            {task.title}
                        </span>
                    </div>
                );
            }
        },
        {
            id: 'assignees',
            header: 'Persona Asignada',
            size: 150,
            cell: ({ row }) => {
                const assignees = row.original.assignees || [];
                if (assignees.length === 0) return <Avatar />;
                return (
                    <div className="flex -space-x-2">
                        {assignees.map(a => <Avatar key={a.id} name={a.name} />)}
                    </div>
                );
            }
        },
        {
            id: 'dueDate',
            header: 'Fecha Límite',
            accessorKey: 'dueDate',
            size: 120,
            cell: info => {
                const dateString = info.getValue<string | null>();
                if (!dateString) return <span className="text-foreground-secondary">-</span>;
                const date = new Date(dateString.replace(/-/g, '/'));
                return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
            }
        },
        {
            id: 'priority',
            header: 'Prioridad',
            size: 120,
            cell: ({ row }) => {
                if (!priorityField) return <span className="text-foreground-secondary">-</span>;
                const valueData = row.original.customFields?.[priorityField.id];
                if (!valueData?.optionId) return <span className="text-foreground-secondary">-</span>;
                const option = (fieldOptions[priorityField.id] || []).find(opt => opt.id === valueData.optionId);
                if (!option) return <span className="text-foreground-secondary">-</span>;
                return <Tag text={option.value} color={option.color} />;
            }
        },
        // Mapeamos el resto de campos personalizados como columnas
        ...otherCustomFields.map(field => ({
            id: field.id,
            header: field.name,
            size: 180,
            cell: ({ row }: { row: any }) => {
                const valueData = row.original.customFields?.[field.id];
                if (!valueData) return <span className="text-foreground-secondary">-</span>;
                 switch(field.type) {
                    case 'dropdown':
                        if (!valueData.optionId) return <span className="text-foreground-secondary">-</span>;
                        const option = (fieldOptions[field.id] || []).find(opt => opt.id === valueData.optionId);
                        if (!option) return <span className="text-foreground-secondary">-</span>;
                        return <Tag text={option.value} color={option.color} />;
                    case 'labels':
                        const selectedOptionIds = valueData.optionIds || [];
                        if (selectedOptionIds.length === 0) return <span className="text-foreground-secondary">-</span>;
                        const allOptions = fieldOptions[field.id] || [];
                        return (<div className="flex flex-wrap gap-1">{selectedOptionIds.map((id: string) => { const option = allOptions.find(opt => opt.id === id); if (!option) return null; return (<Tag key={id} text={option.value} color={option.color} />);})}</div>);
                    case 'text':
                        return <div className="max-w-[150px] truncate" title={valueData.value}>{valueData.value || <span className="text-foreground-secondary">-</span>}</div>;
                    default:
                        return <span className="text-foreground-secondary">-</span>;
                }
            }
        }))
    ];

    return columns;
};