/**
 * NotificationContext
 *
 * Este contexto gerencia o sistema de notificações da aplicação.
 * Ele fornece funcionalidades para:
 * - Exibir notificações de sucesso
 * - Exibir notificações de erro
 * - Exibir notificações de aviso
 * - Exibir notificações de informação
 * - Gerenciar o estado de visibilidade das notificações
 * - Controlar a duração das notificações
 *
 * O contexto é usado em toda a aplicação para fornecer feedback ao usuário
 * sobre ações realizadas, erros ou informações importantes.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface Notification {
  id: number;
  type: NotificationType;
  message: string;
  details?: string | Record<string, unknown>;
  timestamp: Date;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (
    type: NotificationType,
    message: string,
    details?: string | Record<string, unknown>
  ) => void;
  removeNotification: (id: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const addNotification = useCallback(
    (type: NotificationType, message: string, details?: string | Record<string, unknown>) => {
      const id = Date.now();
      const notification: Notification = {
        id,
        type,
        message,
        details,
        timestamp: new Date(),
      };

      setNotifications(prev => [...prev, notification]);

      // Remover notificação após 5 segundos (exceto para erros)
      if (type !== 'error') {
        setTimeout(() => {
          removeNotification(id);
        }, 5000);
      }
    },
    [removeNotification]
  );

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
