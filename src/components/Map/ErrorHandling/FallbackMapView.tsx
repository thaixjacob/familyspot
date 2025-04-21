import React from 'react';
import { Place } from '../../../types/Place';

interface FallbackMapViewProps {
  places: Place[];
  onRetry: () => void;
  errorMessage?: string;
}

/**
 * FallbackMapView - Componente alternativo quando o mapa do Google não pode ser carregado
 *
 * Este componente fornece uma visualização alternativa dos lugares disponíveis
 * quando o mapa interativo do Google Maps falha completamente, permitindo ao
 * usuário ainda ter acesso às informações dos lugares, mas de forma não visual.
 */
const FallbackMapView: React.FC<FallbackMapViewProps> = ({ places, onRetry, errorMessage }) => {
  return (
    <div className="h-screen overflow-auto bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-red-500 mr-4"
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
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Não foi possível carregar o mapa
              </h2>
              <p className="text-gray-600">
                {errorMessage ||
                  'Ocorreu um erro ao carregar o mapa interativo. Mostrando uma visualização alternativa dos lugares.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center mb-6">
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Tentar carregar mapa novamente
            </button>

            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 transition-colors"
            >
              Recarregar página
            </button>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Lista de lugares disponíveis ({places.length})
        </h3>

        {places.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600">Não há lugares disponíveis para mostrar.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {places.map(place => (
              <div key={place.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-1">{place.name}</h3>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {place.category}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {place.priceRange}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">
                    <strong>Faixas etárias:</strong> {place.ageGroups.join(', ')}
                  </p>

                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Comodidades:</p>
                    <div className="flex flex-wrap gap-1">
                      {place.amenities.changingTables && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">
                          Fraldário
                        </span>
                      )}
                      {place.amenities.playAreas && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">
                          Área de recreação
                        </span>
                      )}
                      {place.amenities.highChairs && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">
                          Cadeiras para crianças
                        </span>
                      )}
                      {place.amenities.accessibility && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">
                          Acessibilidade
                        </span>
                      )}
                      {place.amenities.kidsMenu && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">
                          Menu infantil
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    {place.verifications > 0 ? (
                      <span className="flex items-center">
                        <svg
                          className="w-3 h-3 text-green-500 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          ></path>
                        </svg>
                        Verificado por {place.verifications}{' '}
                        {place.verifications === 1 ? 'pessoa' : 'pessoas'}
                      </span>
                    ) : (
                      <span>Ainda não verificado</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FallbackMapView;
