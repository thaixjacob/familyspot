import React from 'react';
import { Place } from '../../types/Place';
import { UserState } from '../../App/ContextProviders/UserContext';
import ErrorBoundary from '../../SharedComponents/ErrorBoundary/ErrorBoundary';
import LoadingSpinner from '../../SharedComponents/Loading/LoadingSpinner';

interface MapControlsProps {
  isAddingPlace: boolean;
  isLocationLoading: boolean;
  isNearbyMode: boolean;
  nearbyPlaces: Place[];
  userState: UserState;
  onAddPlaceClick: () => void;
  onNearMeClick: () => void;
  onApplyFiltersInView: () => void;
}

const MapControls: React.FC<MapControlsProps> = ({
  isAddingPlace,
  isLocationLoading,
  isNearbyMode,
  nearbyPlaces,
  userState,
  onAddPlaceClick,
  onNearMeClick,
  onApplyFiltersInView,
}) => {
  if (isAddingPlace) return null;

  return (
    <ErrorBoundary
      fallback={
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <h3 className="text-red-800 font-medium mb-2">Ops! Algo deu errado</h3>
            <p className="text-red-600 text-sm mb-3">
              Ocorreu um erro inesperado. Por favor, tente novamente.
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Recarregar
            </button>
          </div>
        </div>
      }
    >
      <>
        <div className="flex space-x-2 mb-4">
          <button
            onClick={onAddPlaceClick}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            disabled={!userState.isAuthenticated}
          >
            {userState.isAuthenticated ? 'Adicionar Local' : 'Faça login para adicionar'}
          </button>
          <button
            onClick={onNearMeClick}
            className={`px-4 py-2 rounded-md ${
              isLocationLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isLocationLoading ? (
              <span className="flex items-center">
                <LoadingSpinner size="sm" color="text-white" />
                <span className="ml-2">Buscando...</span>
              </span>
            ) : (
              'Próximo a Mim'
            )}
          </button>
          <button
            onClick={onApplyFiltersInView}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
          >
            Aplicar Filtros na Região
          </button>
        </div>
        {isNearbyMode && nearbyPlaces.length > 0 && (
          <div className="text-sm text-gray-600 mb-2">
            Mostrando {nearbyPlaces.length} lugares próximos a você
          </div>
        )}
      </>
    </ErrorBoundary>
  );
};

export default MapControls;
