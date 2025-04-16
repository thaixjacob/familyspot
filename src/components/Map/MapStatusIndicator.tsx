import React from 'react';
import LoadingSpinner from '../../SharedComponents/Loading/LoadingSpinner';

interface MapStatusIndicatorProps {
  isLoading: boolean;
  placesCount: number;
  isPanning: boolean;
  showNeedsSearch?: boolean;
}

const MapStatusIndicator: React.FC<MapStatusIndicatorProps> = ({
  isLoading,
  placesCount,
  isPanning,
  showNeedsSearch = false,
}) => {
  // Se estiver carregando, mostra o spinner de carregamento
  if (isLoading) {
    return (
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 bg-white bg-opacity-90 p-4 rounded-lg shadow-md status-indicator">
        <div className="flex flex-col items-center">
          <LoadingSpinner size="md" color="text-blue-600" />
          <span className="mt-2 text-blue-800 font-medium">Carregando lugares...</span>
        </div>
      </div>
    );
  }

  // Se estiver movendo o mapa, mostra um feedback sutil
  if (isPanning) {
    return (
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 bg-white bg-opacity-80 px-4 py-2 rounded-full shadow-md transition-opacity duration-300 status-indicator">
        <div className="flex items-center">
          <span className="text-gray-700 text-sm">Mova o mapa para ver mais lugares</span>
        </div>
      </div>
    );
  }

  // Se não encontrou lugares na área
  if (placesCount === 0 && !isLoading && !showNeedsSearch) {
    return (
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 bg-white bg-opacity-90 px-4 py-2 rounded-full shadow-md status-indicator">
        <div className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-500 mr-2"
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
          <span className="text-gray-700 text-sm">Nenhum lugar encontrado nesta área</span>
        </div>
      </div>
    );
  }

  // Se há muitos lugares
  if (placesCount > 20) {
    return (
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 bg-white bg-opacity-90 px-4 py-2 rounded-full shadow-md status-indicator">
        <div className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-green-500 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-700 text-sm">{placesCount} lugares encontrados</span>
        </div>
      </div>
    );
  }

  // Estado neutro - alguns lugares encontrados
  if (placesCount > 0) {
    return (
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 bg-white bg-opacity-90 px-4 py-2 rounded-full shadow-md status-indicator">
        <div className="flex items-center">
          <span className="text-blue-700 text-sm">
            {placesCount} {placesCount === 1 ? 'lugar encontrado' : 'lugares encontrados'}
          </span>
        </div>
      </div>
    );
  }

  // Caso de precisar aplicar uma busca
  if (showNeedsSearch) {
    return (
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 bg-white bg-opacity-90 px-4 py-2 rounded-full shadow-md status-indicator">
        <div className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-yellow-500 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="text-yellow-700 text-sm">Explore esta área do mapa</span>
        </div>
      </div>
    );
  }

  // Caso nenhuma condição acima se aplique, não mostrar nada
  return null;
};

export default MapStatusIndicator;
