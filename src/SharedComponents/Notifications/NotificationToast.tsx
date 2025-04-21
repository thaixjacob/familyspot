import React from 'react';
import { useNotification } from '../../App/ContextProviders/NotificationContext';

const NotificationToast: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  if (notifications.length === 0) return null;

  // Ordenar notificações para exibir as mais recentes primeiro
  const sortedNotifications = [...notifications].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {sortedNotifications.map(notification => (
        <div
          key={notification.id}
          className={`${getBackgroundColor(
            notification.type
          )} text-white p-4 rounded-lg shadow-lg max-w-md flex items-start justify-between transform transition-all duration-300 ease-in-out opacity-90 hover:opacity-100`}
        >
          <div>
            <p className="font-semibold">{notification.message}</p>
          </div>
          <button
            onClick={() => removeNotification(notification.id)}
            className="ml-4 text-white hover:text-gray-200 focus:outline-none"
            aria-label="Fechar notificação"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
