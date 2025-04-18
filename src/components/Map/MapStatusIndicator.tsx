import React from 'react';

interface MapStatusIndicatorProps {
  isLoading: boolean;
  placesCount: number;
  isPanning: boolean;
  showNeedsSearch: boolean;
}

/**
 * Componente que exibe o status atual do mapa para o usuário
 * incluindo contagem de lugares, carregamento, e dicas para busca
 */
const MapStatusIndicator: React.FC<MapStatusIndicatorProps> = ({
  isLoading,
  placesCount,
  isPanning,
  showNeedsSearch,
}) => {
  if (isLoading) {
    return (
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white bg-opacity-90 px-4 py-2 rounded-full shadow-md">
        <div className="flex items-center">
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="text-blue-700 text-sm">Carregando lugares...</span>
        </div>
      </div>
    );
  }

  if (isPanning && placesCount > 0) {
    return (
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-blue-100 bg-opacity-90 px-4 py-2 rounded-full shadow-md transition-opacity duration-300">
        <div className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-blue-500 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
            />
          </svg>
          <span className="text-blue-700 text-sm">{placesCount} lugares visíveis</span>
        </div>
      </div>
    );
  }

  if (showNeedsSearch) {
    return (
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-blue-50 bg-opacity-90 px-4 py-2 rounded-full shadow-md">
        <div className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-blue-500 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <span className="text-blue-700 text-sm">Explore o mapa ou use "Próximo a Mim"</span>
        </div>
      </div>
    );
  }

  if (placesCount > 0) {
    return (
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-green-50 bg-opacity-90 px-4 py-2 rounded-full shadow-md transition-opacity duration-300">
        <div className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-green-500 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-green-700 text-sm">{placesCount} lugares encontrados</span>
        </div>
      </div>
    );
  }

  return null;
};

export default MapStatusIndicator;
