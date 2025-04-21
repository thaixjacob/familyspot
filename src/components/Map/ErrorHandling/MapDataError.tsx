import React from 'react';

interface MapDataErrorProps {
  errorType:
    | 'data_fetch'
    | 'bounds_calculation'
    | 'places_processing'
    | 'firebase_error'
    | 'unknown';
  message?: string;
  onRetry: () => void;
  showDetails?: boolean;
}

/**
 * MapDataError - Componente que exibe erros específicos relacionados a dados do mapa
 *
 * Este componente fornece feedback visual apropriado quando ocorrem erros ao carregar
 * ou processar dados para exibição no mapa, com opções para tentar novamente.
 */
const MapDataError: React.FC<MapDataErrorProps> = ({
  errorType,
  message,
  onRetry,
  showDetails = false,
}) => {
  // Determinar mensagem com base no tipo de erro
  const getErrorMessage = () => {
    switch (errorType) {
      case 'data_fetch':
        return 'Não foi possível carregar os dados dos lugares no mapa.';
      case 'bounds_calculation':
        return 'Ocorreu um erro ao calcular a área visível do mapa.';
      case 'places_processing':
        return 'Não foi possível processar os lugares para exibição.';
      case 'firebase_error':
        return 'Erro na comunicação com o servidor de dados.';
      case 'unknown':
      default:
        return 'Ocorreu um erro inesperado ao processar os dados do mapa.';
    }
  };

  // Determinar ícone com base no tipo de erro
  const getIcon = () => {
    switch (errorType) {
      case 'data_fetch':
      case 'firebase_error':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-yellow-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'bounds_calculation':
      case 'places_processing':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-orange-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-red-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  return (
    <div className="p-4 my-2 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">{getIcon()}</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            Problema ao carregar dados do mapa
          </h3>
          <p className="text-sm text-gray-600 mb-3">{message || getErrorMessage()}</p>

          {showDetails && message && (
            <div className="mb-4 p-2 bg-gray-100 rounded text-xs font-mono text-gray-700 overflow-auto max-h-24">
              {message}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onRetry}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              Tentar novamente
            </button>

            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
            >
              Recarregar página
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapDataError;
