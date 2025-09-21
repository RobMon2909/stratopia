// client/src/components/EditableTableCell.tsx
import React, { useState, useEffect } from 'react';
import type { Row, Column, Table } from '@tanstack/react-table';
import type { NestedTask } from '../types';

interface EditableTableCellProps {
  getValue: () => any;
  row: Row<NestedTask>;
  column: Column<NestedTask, unknown>;
  table: Table<NestedTask>;
}

const EditableTableCell: React.FC<EditableTableCellProps> = ({ getValue, row, column, table }) => {
  const initialValue = getValue();
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const { updateData } = table.options.meta as any;

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    updateData(row.original.id, column.id, value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <input
        value={value || ''}
        onChange={e => setValue(e.target.value)}
        onBlur={handleBlur}
        autoFocus
        className="w-full bg-input text-foreground border border-ring rounded px-1 py-0.5"
      />
    );
  }

  return (
    <div onDoubleClick={handleDoubleClick} className="w-full min-h-[28px]" title="Doble clic para editar">
      {value || <span className="text-foreground-secondary">-</span>}
    </div>
  );
};

export default EditableTableCell;