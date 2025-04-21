import React, { useState, useCallback } from 'react';
import LoadingSpinner from '../../../SharedComponents/Loading/LoadingSpinner';

interface RetryOperationProps {
  operationName: string;
  onRetry: () => Promise<boolean>;
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  onSuccess?: () => void;
  onMaxRetriesReached?: () => void;
  children: React.ReactNode;
}

/**
 * RetryOperation - Componente para lidar com tentativas de operações falhas
 *
 * Este componente implementa uma estratégia de retry com exponential backoff
 * para operações que podem falhar temporariamente, como carregamento de dados
 * do mapa ou acesso à geolocalização.
 */
const RetryOperation: React.FC<RetryOperationProps> = ({
  operationName,
  onRetry,
  maxRetries = 3,
  initialDelayMs = 1000,
  maxDelayMs = 10000,
  onSuccess,
  onMaxRetriesReached,
  children,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [retryDelay, setRetryDelay] = useState(initialDelayMs);
  const [showRetryUI, setShowRetryUI] = useState(false);

  // Implementar backoff exponencial com jitter
  const calculateNextDelay = useCallback(
    (currentDelay: number) => {
      // Exponential backoff: dobrar o tempo a cada tentativa
      const exponentialDelay = currentDelay * 2;
      // Adicionar uma variação aleatória (jitter) para evitar thundering herd
      const jitter = Math.random() * 0.3 * exponentialDelay;
      // Limitar ao delay máximo
      return Math.min(exponentialDelay + jitter, maxDelayMs);
    },
    [maxDelayMs]
  );

  const executeRetry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      setIsRetrying(false);
      setShowRetryUI(true);
      if (onMaxRetriesReached) {
        onMaxRetriesReached();
      }
      return;
    }

    setIsRetrying(true);

    try {
      const success = await onRetry();

      if (success) {
        setIsRetrying(false);
        setRetryCount(0);
        setRetryDelay(initialDelayMs);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // Falha, agendar próxima tentativa
        const nextDelay = calculateNextDelay(retryDelay);
        setRetryDelay(nextDelay);
        setRetryCount(prev => prev + 1);

        setTimeout(() => {
          executeRetry();
        }, nextDelay);
      }
    } catch (error) {
      // Erro na operação, agendar próxima tentativa
      const nextDelay = calculateNextDelay(retryDelay);
      setRetryDelay(nextDelay);
      setRetryCount(prev => prev + 1);

      setTimeout(() => {
        executeRetry();
      }, nextDelay);
    }
  }, [
    retryCount,
    maxRetries,
    onMaxRetriesReached,
    onRetry,
    retryDelay,
    calculateNextDelay,
    initialDelayMs,
    onSuccess,
  ]);

  // Iniciar o processo de retry manualmente
  const startRetry = useCallback(() => {
    setRetryCount(0);
    setRetryDelay(initialDelayMs);
    setShowRetryUI(false);
    executeRetry();
  }, [executeRetry, initialDelayMs]);

  // Renderizar UI apropriada com base no estado
  if (isRetrying) {
    return (
      <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg shadow-sm">
        <LoadingSpinner size="sm" color="text-blue-500" />
        <div className="ml-3">
          <p className="text-sm font-medium text-blue-700">Tentando novamente {operationName}...</p>
          <p className="text-xs text-blue-500">
            Tentativa {retryCount + 1} de {maxRetries}
          </p>
        </div>
      </div>
    );
  }

  if (showRetryUI) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg shadow-md">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-yellow-500 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-800 mb-2">Falha ao {operationName}</h3>
        <p className="text-sm text-gray-600 mb-4 text-center">
          Não foi possível concluir a operação após {maxRetries} tentativas.
        </p>
        <div className="flex space-x-3">
          <button
            onClick={startRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Tentar novamente
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            Recarregar página
          </button>
        </div>
      </div>
    );
  }

  // Componente filho é renderizado quando não estamos retentando nem mostrando UI de retry
  return <>{children}</>;
};

export default RetryOperation;
