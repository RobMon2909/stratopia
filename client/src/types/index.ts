export interface User { id: string; name: string; email: string; role: string; createdAt: string; }
export interface CustomField { id: string; name: string; type: 'text' | 'dropdown' | 'labels' | 'files'; }
export interface FieldOption { id: string; value: string; color: string; sortOrder?: number; }
export interface Task { 
    id: string; listId: string; parentId: string | null; title: string; 
    description: string | null; status: string; startDate: string | null;
    dueDate: string | null; priority: string | null; 
    assignees: { id: string; name: string }[];
    customFields?: { [fieldId: string]: { value: any; valueId: string; optionId?: string | null; optionIds?: string[]; } };
}
export type NestedTask = Task & { children: NestedTask[] };
export interface List { id: string; name: string; tasks: Task[]; }
export interface Workspace { id: string; name: string; createdAt: string; }