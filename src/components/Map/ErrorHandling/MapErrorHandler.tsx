import React, { useState, useEffect } from 'react';
import NotificationService from '../../../App/Services/notificationService';
import { logError } from '../../../utils/logger';

type ErrorType =
  | 'location_permission_denied'
  | 'location_unavailable'
  | 'map_load_error'
  | 'places_fetch_error'
  | 'api_key_missing'
  | 'place_details_error'
  | 'cache_error'
  | 'bounds_calculation_error'
  | 'network_error'
  | 'firebase_error';

interface ErrorConfig {
  message: string;
  userMessage: string;
  action?: () => void;
  actionLabel?: string;
  severity: 'error' | 'warning' | 'info';
  timeout?: number; // in milliseconds
}

// Error configurations with user-friendly messages
const ERROR_CONFIGS: Record<ErrorType, ErrorConfig> = {
  location_permission_denied: {
    message: 'Permissão de localização negada pelo usuário',
    userMessage:
      'Para usar a funcionalidade "Próximo a Mim", precisamos acessar sua localização. Por favor, permita o acesso nas configurações do seu navegador.',
    severity: 'warning',
    timeout: 7000,
  },
  location_unavailable: {
    message: 'Não foi possível obter a localização atual',
    userMessage:
      'Não conseguimos determinar sua localização. Verifique se o GPS está ativado ou tente novamente mais tarde.',
    severity: 'warning',
  },
  map_load_error: {
    message: 'Erro ao carregar o Google Maps',
    userMessage:
      'Houve um problema ao carregar o mapa. Verifique sua conexão com a internet e tente novamente.',
    actionLabel: 'Recarregar',
    severity: 'error',
  },
  places_fetch_error: {
    message: 'Erro ao buscar lugares',
    userMessage:
      'Não foi possível carregar os lugares nesta área. Tente navegar para outra região ou recarregar a página.',
    severity: 'warning',
  },
  api_key_missing: {
    message: 'Chave da API do Google Maps não encontrada',
    userMessage:
      'Configuração do mapa incompleta. Por favor, tente novamente mais tarde ou entre em contato com o suporte.',
    severity: 'error',
  },
  place_details_error: {
    message: 'Erro ao carregar detalhes do lugar',
    userMessage:
      'Não foi possível obter os detalhes deste local. Tente clicar em outro ponto do mapa.',
    severity: 'warning',
  },
  cache_error: {
    message: 'Erro no sistema de cache',
    userMessage:
      'Houve um problema ao processar os dados do mapa. Tentaremos novamente automaticamente.',
    severity: 'info',
    timeout: 3000,
  },
  bounds_calculation_error: {
    message: 'Erro ao calcular os limites do mapa',
    userMessage:
      'Houve um problema ao calcular a área visível do mapa. Tente ajustar o zoom ou mover o mapa.',
    severity: 'warning',
  },
  network_error: {
    message: 'Erro de conexão',
    userMessage:
      'Parece que você está offline ou com uma conexão instável. Verifique sua internet e tente novamente.',
    actionLabel: 'Tentar novamente',
    severity: 'error',
  },
  firebase_error: {
    message: 'Erro na comunicação com o servidor',
    userMessage: 'Não foi possível comunicar com o servidor. Tente novamente em alguns momentos.',
    severity: 'error',
  },
};

interface MapErrorHandlerProps {
  children: React.ReactNode;
  onReload?: () => void;
}

export const handleMapError = (
  error: unknown,
  errorType: ErrorType,
  additionalContext?: Record<string, unknown>
) => {
  // Log o erro
  logError(error, `map_error_${errorType}`);

  // Obter a configuração do erro
  const errorConfig = ERROR_CONFIGS[errorType];

  // Mostrar a notificação para o usuário
  NotificationService[errorConfig.severity](
    errorConfig.userMessage,
    additionalContext || { errorType }
  );

  return {
    type: errorType,
    message: errorConfig.message,
    userMessage: errorConfig.userMessage,
  };
};

export const handleFirestoreOfflineError = (error: Error) => {
  // Verificar se é um erro de cliente offline
  if (error.message.includes('client is offline')) {
    handleMapError(error, 'network_error', { context: 'firestore_offline' });

    // Mostrar uma notificação específica para o usuário
    NotificationService.warning(
      'Você parece estar offline. O aplicativo continuará funcionando, mas alguns dados podem não estar atualizados.',
      {
        actionLabel: 'Tentar reconectar',
        action: () => window.location.reload(),
      }
    );

    return true; // Erro tratado
  }

  return false; // Erro não tratado
};

const MapErrorHandler: React.FC<MapErrorHandlerProps> = ({ children, onReload }) => {
  const [currentError, setCurrentError] = useState<ErrorType | null>(null);

  // Reset error after showing notification
  useEffect(() => {
    if (currentError) {
      const errorConfig = ERROR_CONFIGS[currentError];
      if (errorConfig.timeout) {
        const timer = setTimeout(() => {
          setCurrentError(null);
        }, errorConfig.timeout);
        return () => clearTimeout(timer);
      }
    }
  }, [currentError]);

  // Handle default actions for errors
  const handleAction = (errorType: ErrorType) => {
    const config = ERROR_CONFIGS[errorType];

    if (config.action) {
      config.action();
    } else if (errorType === 'map_load_error' || errorType === 'network_error') {
      if (onReload) {
        onReload();
      } else {
        window.location.reload();
      }
    }

    setCurrentError(null);
  };

  return (
    <div className="relative">
      {currentError && ERROR_CONFIGS[currentError].actionLabel && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white bg-opacity-90 px-4 py-3 rounded-lg shadow-md flex items-center">
          <span className="mr-4 text-sm">{ERROR_CONFIGS[currentError].userMessage}</span>
          <button
            onClick={() => handleAction(currentError)}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            {ERROR_CONFIGS[currentError].actionLabel}
          </button>
        </div>
      )}

      {children}
    </div>
  );
};

export default MapErrorHandler;
