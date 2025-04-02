import React from 'react';
import { useNotification } from '../../contexts/NotificationContext';

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

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`${getBackgroundColor(
            notification.type
          )} text-white p-4 rounded-lg shadow-lg max-w-md flex items-start justify-between transform transition-all duration-300 ease-in-out`}
        >
          <div>
            <p className="font-semibold">{notification.message}</p>
            {notification.details && process.env.NODE_ENV === 'development' && (
              <pre className="mt-2 text-sm opacity-90 whitespace-pre-wrap">
                {typeof notification.details === 'string'
                  ? notification.details
                  : JSON.stringify(notification.details, null, 2)}
              </pre>
            )}
          </div>
          <button
            onClick={() => removeNotification(notification.id)}
            className="ml-4 text-white hover:text-gray-200 focus:outline-none"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
