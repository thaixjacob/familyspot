import React, { useState, useEffect } from 'react';
import NotificationService from '../../../App/Services/notificationService';

interface NetworkStatusMonitorProps {
  children: React.ReactNode;
  onStatusChange?: (isOnline: boolean) => void;
}

/**
 * NetworkStatusMonitor - Monitora o status da conexão de rede
 *
 * Este componente monitora o status da conexão de rede do usuário e fornece
 * feedback visual quando a conexão é perdida ou restaurada, o que é crucial
 * para operações que dependem de rede como carregamento de mapas.
 */
const NetworkStatusMonitor: React.FC<NetworkStatusMonitorProps> = ({
  children,
  onStatusChange,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showOfflineBanner, setShowOfflineBanner] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      NotificationService.success('Conexão restaurada! O mapa agora está atualizado.');
      if (onStatusChange) onStatusChange(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineBanner(true);
      NotificationService.warning(
        'Você está offline. Algumas funcionalidades do mapa podem não funcionar corretamente.'
      );
      if (onStatusChange) onStatusChange(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onStatusChange]);

  // Verificar periodicamente a conectividade real com o servidor
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    if (isOnline) {
      // Verificar a cada 30 segundos se estamos realmente online
      intervalId = setInterval(() => {
        fetch('https://www.gstatic.com/generate_204', {
          method: 'HEAD',
          cache: 'no-store',
          mode: 'no-cors',
          headers: { 'Cache-Control': 'no-cache' },
        }).catch(() => {
          // Se falhar, provavelmente estamos offline mas o navegador não detectou
          if (isOnline) {
            setIsOnline(false);
            setShowOfflineBanner(true);
            NotificationService.warning(
              'Problemas de conexão detectados. Algumas funcionalidades do mapa podem não funcionar corretamente.'
            );
            if (onStatusChange) onStatusChange(false);
          }
        });
      }, 30000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOnline, onStatusChange]);

  const dismissOfflineBanner = () => {
    setShowOfflineBanner(false);
  };

  return (
    <>
      {showOfflineBanner && !isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white p-2 z-50 flex justify-between items-center">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>Você está offline. O mapa pode não funcionar corretamente.</span>
          </div>
          <button
            onClick={dismissOfflineBanner}
            className="text-white hover:text-yellow-100"
            aria-label="Fechar aviso"
          >
            ✕
          </button>
        </div>
      )}
      {children}
    </>
  );
};

export default NetworkStatusMonitor;
