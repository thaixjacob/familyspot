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

const generateUniqueId = (): number => {
  return Date.now() + Math.floor(Math.random() * 10000);
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const addNotification = useCallback(
    (type: NotificationType, message: string, details?: string | Record<string, unknown>) => {
      const id = generateUniqueId();
      const notification: Notification = {
        id,
        type,
        message,
        details,
        timestamp: new Date(),
      };

      // Verificar se já existe uma notificação com mensagem idêntica para evitar duplicação
      setNotifications(prev => {
        // Se já temos uma notificação com a mesma mensagem, substituí-la em vez de adicionar uma nova
        const duplicateIndex = prev.findIndex(n => n.message === message && n.type === type);

        if (duplicateIndex >= 0) {
          const updatedNotifications = [...prev];
          updatedNotifications[duplicateIndex] = notification;
          return updatedNotifications;
        }

        // Caso contrário, adicionar nova notificação
        return [...prev, notification];
      });

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
