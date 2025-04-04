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

import React from 'react';
import Header from './Header';
import Footer from './Footer';
import { Place } from '../../types/Place';
import Map from '../../components/Map/Map';
import FilterPanel from '../../components/Filters/FilterPanel';
import PlaceCardSummary from '../../components/Places/PlaceCardSummary';

interface MainLayoutProps {
  showWelcome: boolean;
  setShowWelcome: (show: boolean) => void;
  filteredPlaces: Place[];
  isLoading: boolean;
  onPlaceAdded: (newPlace: Place) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  showWelcome,
  setShowWelcome,
  filteredPlaces,
  isLoading,
  onPlaceAdded,
}) => {
  return (
    <div className="flex flex-col h-screen">
      <Header showWelcome={showWelcome} setShowWelcome={setShowWelcome} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with filters and place cards */}
        <div className="w-96 bg-gray-50 p-4 overflow-y-auto flex flex-col">
          <FilterPanel />

          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Places ({filteredPlaces.length})
            </h2>
            {isLoading ? (
              <div className="text-center py-6 text-gray-500">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                Carregando lugares...
              </div>
            ) : filteredPlaces.length > 0 ? (
              <div className="space-y-4">
                {filteredPlaces.map(place => (
                  <PlaceCardSummary key={place.id} place={place} />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                Nenhum lugar corresponde aos seus filtros
              </div>
            )}
          </div>
        </div>

        {/* Map area */}
        <div className="flex-1 h-full">
          <Map places={filteredPlaces} onPlaceAdded={onPlaceAdded} />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default MainLayout;
