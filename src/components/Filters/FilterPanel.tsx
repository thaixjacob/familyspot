import React, { useCallback } from 'react';
import { useFilter } from '../../App/ContextProviders/FilterContext';

export interface FilterValues {
  category: string;
  ageGroups: string[];
  priceRange: string[];
  amenities: { [key: string]: boolean };
}

interface FilterPanelProps {
  onApplyFiltersInView?: () => void;
}

interface AmenityItem {
  key: string;
  label: string;
}

interface AmenitiesByCategory {
  [key: string]: AmenityItem[];
}

const FilterPanel = ({ onApplyFiltersInView }: FilterPanelProps) => {
  const { filters, setFilters, clearFilters } = useFilter();

  const getAmenitiesForCategory = (): AmenitiesByCategory => {
    switch (filters.category) {
      case 'activities':
        return {
          accessibility: [
            { key: 'accessibility', label: 'Rampas, elevadores, sinalização' },
            { key: 'specialNeeds', label: 'Adaptação para necessidades especiais' },
          ],
          structure: [
            { key: 'waitingArea', label: 'Área de espera confortável' },
            { key: 'supervisedActivities', label: 'Atividades com monitores' },
            { key: 'changingTables', label: 'Banheiros com trocador' },
          ],
          transport: [
            { key: 'parking', label: 'Estacionamento no local ou próximo' },
            { key: 'publicTransport', label: 'Transporte público próximo' },
          ],
          facilities: [
            { key: 'drinkingWater', label: 'Bebedouro' },
            { key: 'foodNearby', label: 'Local para comer' },
          ],
        };
      case 'parks':
        return {
          accessibility: [
            { key: 'accessibility', label: 'Carrinho/cadeirantes' },
            { key: 'accessibleTrails', label: 'Trilhas acessíveis' },
          ],
          structure: [
            { key: 'shadedAreas', label: 'Sombra' },
            { key: 'playground', label: 'Brinquedos infantis' },
            { key: 'picnicArea', label: 'Área para piquenique' },
            { key: 'tablesAndBenches', label: 'Mesas e bancos' },
            { key: 'publicRestrooms', label: 'Banheiros públicos' },
            { key: 'changingTables', label: 'Trocador' },
            { key: 'petFriendly', label: 'Pet-friendly' },
            { key: 'nightLighting', label: 'Iluminação noturna' },
          ],
          transport: [
            { key: 'parking', label: 'Estacionamento local ou próximo' },
            { key: 'publicTransport', label: 'Transporte público próximo' },
          ],
          facilities: [
            { key: 'drinkingWater', label: 'Bebedouro' },
            { key: 'foodNearby', label: 'Local para comer' },
          ],
        };
      case 'playgrounds':
        return {
          accessibility: [{ key: 'accessibility', label: 'Carrinho/cadeirantes' }],
          structure: [
            { key: 'shadedAreas', label: 'Sombra' },
            { key: 'picnicArea', label: 'Área para piquenique' },
            { key: 'tablesAndBenches', label: 'Mesas e bancos' },
            { key: 'fencedArea', label: 'Área cercada' },
            { key: 'petFriendly', label: 'Pet-friendly' },
            { key: 'nightLighting', label: 'Iluminação noturna' },
          ],
          transport: [
            { key: 'parking', label: 'Estacionamento local ou próximo' },
            { key: 'publicTransport', label: 'Transporte público próximo' },
          ],
          facilities: [
            { key: 'publicRestrooms', label: 'Banheiros públicos' },
            { key: 'changingTables', label: 'Trocador' },
            { key: 'drinkingWater', label: 'Bebedouro' },
            { key: 'foodNearby', label: 'Local para comer perto' },
          ],
        };
      case 'restaurants':
      case 'cafes':
        return {
          accessibility: [{ key: 'accessibility', label: 'Carrinho/cadeirantes' }],
          structure: [
            { key: 'playAreas', label: 'Área de Brincar' },
            { key: 'changingTables', label: 'Trocador' },
            { key: 'highChairs', label: 'Cadeirão' },
          ],
          facilities: [{ key: 'kidsMenu', label: 'Menu Infantil' }],
        };
      default:
        return {};
    }
  };

  const shouldShowPriceFilter = (): boolean => {
    return ['restaurants', 'cafes', 'activities'].includes(filters.category);
  };

  const handleAgeGroupChange = useCallback(
    (age: string) => {
      const newFilters = {
        ...filters,
        ageGroups: filters.ageGroups.includes(age)
          ? filters.ageGroups.filter(a => a !== age)
          : [...filters.ageGroups, age],
      };
      setFilters(newFilters);
      onApplyFiltersInView?.();
    },
    [filters, setFilters, onApplyFiltersInView]
  );

  const handlePriceRangeChange = (price: string) => {
    const newFilters = {
      ...filters,
      priceRange: filters.priceRange.includes(price)
        ? filters.priceRange.filter(p => p !== price)
        : [...filters.priceRange, price],
    };
    setFilters(newFilters);
    onApplyFiltersInView?.();
  };

  const handleAmenityChange = (amenityKey: string) => {
    setFilters(
      (prevFilters: FilterValues): FilterValues => ({
        ...prevFilters,
        amenities: {
          ...prevFilters.amenities,
          [amenityKey]: !prevFilters.amenities[amenityKey],
        },
      })
    );
    onApplyFiltersInView?.();
  };

  const handleCategoryAmenitiesChange = (category: string, items: AmenityItem[]) => {
    const allSelected = items.every(item => filters.amenities[item.key]);
    const newAmenities = { ...filters.amenities };

    items.forEach(item => {
      newAmenities[item.key] = !allSelected;
    });

    setFilters(
      (prevFilters: FilterValues): FilterValues => ({
        ...prevFilters,
        amenities: newAmenities,
      })
    );
    onApplyFiltersInView?.();
  };

  const handleCategoryChange = (category: string) => {
    const newFilters = {
      ...filters,
      category,
      priceRange: ['restaurants', 'cafes', 'activities'].includes(category)
        ? filters.priceRange
        : [],
    };
    setFilters(newFilters);
    onApplyFiltersInView?.();
  };

  const amenities = getAmenitiesForCategory();

  return (
    <div className="bg-white rounded-lg shadow-md p-5 max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Filtros</h3>
        <button onClick={clearFilters} className="text-sm text-blue-600 hover:text-blue-800">
          Limpar Filtros
        </button>
      </div>

      {(filters.ageGroups.length > 0 ||
        filters.priceRange.length > 0 ||
        Object.values(filters.amenities).some(value => value) ||
        filters.category !== 'all') && (
        <div className="mb-4 p-2 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">Filtros ativos:</p>
          <ul className="text-xs text-blue-600 mt-1">
            {filters.category !== 'all' && <li>Categoria: {filters.category}</li>}
            {filters.ageGroups.length > 0 && (
              <li>Faixas etárias: {filters.ageGroups.join(', ')}</li>
            )}
            {filters.priceRange.length > 0 && <li>Preços: {filters.priceRange.join(', ')}</li>}
            {Object.entries(filters.amenities)
              .filter(entry => entry[1])
              .map(([key]) => (
                <li key={key}>
                  {key === 'changingTables' && 'Fraldário'}
                  {key === 'playAreas' && 'Área de Brincar'}
                  {key === 'highChairs' && 'Cadeirão'}
                  {key === 'accessibility' && 'Acessibilidade'}
                  {key === 'kidsMenu' && 'Menu Infantil'}
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="mb-5">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          <label htmlFor="category-select">Categoria</label>
        </h4>
        <select
          id="category-select"
          value={filters.category}
          onChange={e => handleCategoryChange(e.target.value)}
          className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">Todas as Categorias</option>
          <option value="parks">Parques</option>
          <option value="restaurants">Restaurantes</option>
          <option value="activities">Atividades</option>
          <option value="playgrounds">Parquinhos</option>
          <option value="cafes">Cafés</option>
        </select>
      </div>

      <div className="mb-5">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Faixas Etárias</h4>
        <div className="space-y-2">
          {['0-1', '1-3', '3-5', '5+'].map(age => (
            <label key={age} className="flex items-center">
              <input
                type="checkbox"
                checked={filters.ageGroups.includes(age)}
                onChange={() => handleAgeGroupChange(age)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{age} anos</span>
            </label>
          ))}
        </div>
      </div>

      {shouldShowPriceFilter() && (
        <div className="mb-5">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Faixa de Preço</h4>
          <div className="flex flex-wrap gap-2">
            {['$', '$$', '$$$', '$$$$'].map(price => (
              <button
                key={price}
                onClick={() => handlePriceRangeChange(price)}
                className={`px-3 py-1 text-sm border rounded-full ${
                  filters.priceRange.includes(price)
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {price}
              </button>
            ))}
          </div>
        </div>
      )}

      {filters.category !== 'all' && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Comodidades</h4>
          <div className="space-y-2">
            {Object.entries(amenities).map(([category, items]) => (
              <div key={category} className="space-y-2">
                <details className="border rounded group">
                  <summary className="p-2 cursor-pointer flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-gray-500 transition-transform duration-200 group-open:rotate-180"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                      <div className="flex items-center">
                        {category === 'accessibility' && '♿ Acessibilidade'}
                        {category === 'structure' && '🧺 Estrutura'}
                        {category === 'transport' && '🚗 Transporte'}
                        {category === 'facilities' && '🍔 Alimentação'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          checked={items.every(item => filters.amenities[item.key])}
                          onChange={() => handleCategoryAmenitiesChange(category, items)}
                          onClick={e => e.stopPropagation()}
                        />
                      </label>
                    </div>
                  </summary>
                  <div className="p-2 grid grid-cols-2 gap-2">
                    {items.map(({ key, label }) => (
                      <label
                        key={key}
                        className="flex items-center p-2 border rounded hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          className="mr-2"
                          checked={Boolean(filters.amenities[key])}
                          onChange={() => handleAmenityChange(key)}
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
