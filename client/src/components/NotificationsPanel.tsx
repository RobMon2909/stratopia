// src/components/NotificationsPanel.tsx

import React from 'react';

// Definimos el tipo para una Notificación
export interface Notification {
    id: string;
    actionType: 'ASSIGNED_TASK' | 'MENTIONED';
    entityId: string;
    isRead: number; // 0 o 1
    createdAt: string;
    actorName: string;
    taskTitle: string;
}

interface NotificationsPanelProps {
    notifications: Notification[];
    onClose: () => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ notifications, onClose }) => {
    
    const renderNotificationMessage = (notif: Notification) => {
        switch (notif.actionType) {
            case 'ASSIGNED_TASK':
                return (
                    <span>
                        <span className="font-bold">{notif.actorName}</span> te asignó la tarea <span className="font-bold">"{notif.taskTitle}"</span>.
                    </span>
                );
            case 'MENTIONED':
                 return (
                    <span>
                        <span className="font-bold">{notif.actorName}</span> te mencionó en la tarea <span className="font-bold">"{notif.taskTitle}"</span>.
                    </span>
                );
            default:
                return "Tienes una nueva notificación.";
        }
    };

    return (
        <div className="absolute top-16 right-0 w-80 bg-white rounded-lg shadow-xl border z-50">
            <div className="p-3 flex justify-between items-center border-b">
                <h3 className="font-semibold">Notificaciones</h3>
                <button onClick={onClose} className="text-xl text-gray-500 hover:text-gray-800">&times;</button>
            </div>
            <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                    notifications.map(notif => (
                        <div key={notif.id} className={`p-3 border-b hover:bg-gray-50 ${!notif.isRead ? 'bg-blue-50' : ''}`}>
                            <p className="text-sm text-gray-700">
                                {renderNotificationMessage(notif)}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {new Date(notif.createdAt).toLocaleString()}
                            </p>
                        </div>
                    ))
                ) : (
                    <p className="p-4 text-sm text-gray-500 text-center">No tienes notificaciones.</p>
                )}
            </div>
        </div>
    );
};

export default NotificationsPanel;