// client/src/components/NotificationsPanel.tsx

import React from 'react';

export interface Notification {
    id: string;
    actionType: 'ASSIGNED_TASK' | 'MENTIONED';
    entityId: string;
    isRead: number | boolean;
    createdAt: string;
    actorName: string;
    taskTitle: string;
}

interface NotificationsPanelProps {
    notifications: Notification[];
    onClose: () => void;
    onNotificationClick: (taskId: string) => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ notifications, onClose, onNotificationClick }) => {
    const getNotificationMessage = (notification: Notification) => {
        switch (notification.actionType) {
            case 'ASSIGNED_TASK':
                return <><b>{notification.actorName}</b> te asignó la tarea</>;
            case 'MENTIONED':
                return <><b>{notification.actorName}</b> te mencionó en la tarea</>;
            default:
                return "Nueva notificación";
        }
    };

    return (
        <div className="absolute top-12 right-0 w-80 bg-card border border-border rounded-lg shadow-lg z-20">
            <div className="p-3 border-b border-border flex justify-between items-center">
                <h3 className="font-semibold text-foreground-primary">Notificaciones</h3>
                <button onClick={onClose} className="text-2xl text-foreground-secondary hover:text-foreground-primary">&times;</button>
            </div>
            <div className="max-h-96 overflow-y-auto">
                {Array.isArray(notifications) && notifications.length > 0 ? (
                    notifications.map(n => (
                        <div 
                            key={n.id} 
                            onClick={() => onNotificationClick(n.entityId)}
                            className="p-3 border-b border-border hover:bg-background-secondary cursor-pointer"
                        >
                            <p className="text-sm text-foreground-primary">
                                {getNotificationMessage(n)} <span className="text-blue-500 font-semibold">"{n.taskTitle}"</span>.
                            </p>
                            <p className="text-xs text-foreground-secondary mt-1">
                                {new Date(n.createdAt).toLocaleString('es-ES')}
                            </p>
                        </div>
                    ))
                ) : (
                    <p className="p-4 text-sm text-foreground-secondary">No hay notificaciones nuevas.</p>
                )}
            </div>
        </div>
    );
};

export default NotificationsPanel;