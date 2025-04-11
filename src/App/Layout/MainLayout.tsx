/**
 * Componente MainLayout
 *
 * Este componente é responsável pela estrutura principal da aplicação, incluindo:
 * - Layout geral da página
 * - Integração do mapa e lista de lugares
 * - Gerenciamento do painel de filtros
 * - Exibição de cards de lugares
 *
 * Props:
 * @param {boolean} showWelcome - Controla a exibição da mensagem de boas-vindas
 * @param {(show: boolean) => void} setShowWelcome - Função para controlar o estado da mensagem de boas-vindas
 * @param {Place[]} filteredPlaces - Lista de lugares filtrados
 * @param {boolean} isLoading - Estado de carregamento dos dados
 * @param {(newPlace: Place) => void} onPlaceAdded - Callback para adicionar novo lugar
 *
 * Estrutura:
 * - Header: Cabeçalho da aplicação
 * - Sidebar: Painel de filtros e lista de lugares
 * - MapArea: Área do mapa interativo
 * - Footer: Rodapé da aplicação
 *
 * O componente utiliza:
 * - Contexto de filtros para gerenciar os filtros aplicados
 * - Componentes de UI para exibição de lugares e filtros
 * - Integração com o mapa para visualização geográfica
 */

import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import { Place } from '../../types/Place';
import Map from '../../components/Map/Map';
import FilterPanel from '../../components/Filters/FilterPanel';
import PlaceCardSummary from '../../components/Places/PlaceCardSummary';
import LoadingSpinner from '../../SharedComponents/Loading/LoadingSpinner';
import { useFilter } from '../../App/ContextProviders/FilterContext';

interface MainLayoutProps {
  showWelcome: boolean;
  setShowWelcome: (show: boolean) => void;
  isLoading: boolean;
  onPlaceAdded: (newPlace: Place) => void;
  onPlaceFiltered: (places: Place[]) => void;
  places: Place[];
}

const MainLayout: React.FC<MainLayoutProps> = ({
  showWelcome,
  setShowWelcome,
  isLoading,
  onPlaceAdded,
  onPlaceFiltered,
  places,
}) => {
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [currentPlaces, setCurrentPlaces] = useState<Place[]>(places);
  const [showFilteredResults, setShowFilteredResults] = useState(false);
  const { filters } = useFilter();

  // Atualizar currentPlaces quando places ou filters mudarem
  useEffect(() => {
    if (!mapRef) {
      setCurrentPlaces(places);
      setShowFilteredResults(false);
      return;
    }

    const bounds = mapRef.getBounds();
    if (!bounds) {
      setCurrentPlaces(places);
      setShowFilteredResults(false);
      return;
    }

    // Primeiro filtra por região visível
    const placesInView = places.filter(place => {
      const { latitude, longitude } = place.location;
      return (
        latitude >= bounds.getSouthWest().lat() &&
        latitude <= bounds.getNorthEast().lat() &&
        longitude >= bounds.getSouthWest().lng() &&
        longitude <= bounds.getNorthEast().lng()
      );
    });

    // Depois aplica os filtros selecionados
    const filteredPlaces = placesInView.filter(place => {
      if (filters.category !== 'all' && place.category !== filters.category) {
        return false;
      }

      if (filters.ageGroups.length > 0) {
        const hasMatchingAgeGroup = place.ageGroups.some(age => filters.ageGroups.includes(age));
        if (!hasMatchingAgeGroup) return false;
      }

      if (filters.priceRange.length > 0 && !filters.priceRange.includes(place.priceRange)) {
        return false;
      }

      for (const [key, value] of Object.entries(filters.amenities)) {
        if (value && !place.amenities[key as keyof typeof place.amenities]) {
          return false;
        }
      }

      return true;
    });

    setCurrentPlaces(filteredPlaces);
    onPlaceFiltered(filteredPlaces);

    // Mostrar resultados filtrados quando houver filtros ativos OU quando estiver mostrando todos os lugares
    const hasActiveFilters =
      filters.ageGroups.length > 0 ||
      filters.priceRange.length > 0 ||
      Object.values(filters.amenities).some(value => value);

    // Mostrar a lista se houver filtros ativos OU se houver lugares visíveis no mapa
    setShowFilteredResults(hasActiveFilters || filteredPlaces.length > 0);
  }, [mapRef, places, filters, onPlaceFiltered]);

  return (
    <div className="flex flex-col h-screen">
      <Header showWelcome={showWelcome} setShowWelcome={setShowWelcome} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with filters and place cards */}
        <div className="w-96 bg-gray-50 p-4 overflow-y-auto flex flex-col">
          <FilterPanel />

          {showFilteredResults && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Lugares ({currentPlaces.length})
              </h2>
              {isLoading ? (
                <div className="text-center py-6 text-gray-500">
                  <LoadingSpinner size="md" color="text-blue-500" />
                  <p className="mt-2">Carregando lugares...</p>
                </div>
              ) : currentPlaces.length > 0 ? (
                <div className="space-y-4">
                  {currentPlaces.map(place => (
                    <PlaceCardSummary key={place.id} place={place} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  Nenhum lugar corresponde aos seus filtros
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map area */}
        <div className="flex-1 h-full">
          <Map places={currentPlaces} onPlaceAdded={onPlaceAdded} onMapLoad={setMapRef} />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default MainLayout;
