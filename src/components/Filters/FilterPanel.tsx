import React from 'react';
import { useFilter } from '../../App/ContextProviders/FilterContext';

export interface FilterValues {
  category: string;
  ageGroups: string[];
  priceRange: string[];
  amenities: {
    changingTables: boolean;
    playAreas: boolean;
    highChairs: boolean;
    accessibility: boolean;
  };
}

const FilterPanel = () => {
  const { filters, setFilters, clearFilters } = useFilter();

  const handleAgeGroupChange = (age: string) => {
    setFilters({
      ...filters,
      ageGroups: filters.ageGroups.includes(age)
        ? filters.ageGroups.filter(a => a !== age)
        : [...filters.ageGroups, age],
    });
  };

  const handlePriceRangeChange = (price: string) => {
    setFilters({
      ...filters,
      priceRange: filters.priceRange.includes(price)
        ? filters.priceRange.filter(p => p !== price)
        : [...filters.priceRange, price],
    });
  };

  const handleAmenityChange = (
    amenity: 'changingTables' | 'playAreas' | 'highChairs' | 'accessibility'
  ) => {
    setFilters({
      ...filters,
      amenities: {
        ...filters.amenities,
        [amenity]: !filters.amenities[amenity],
      },
    });
  };

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
          onChange={e => setFilters({ ...filters, category: e.target.value })}
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

      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Comodidades</h4>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.amenities.changingTables}
              onChange={() => handleAmenityChange('changingTables')}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Fraldário</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.amenities.playAreas}
              onChange={() => handleAmenityChange('playAreas')}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Área de Brincar</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.amenities.highChairs}
              onChange={() => handleAmenityChange('highChairs')}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Cadeirão</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.amenities.accessibility}
              onChange={() => handleAmenityChange('accessibility')}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Acessibilidade</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
