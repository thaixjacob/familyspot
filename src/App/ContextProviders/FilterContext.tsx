/**
 * FilterContext
 *
 * Este contexto gerencia o estado global dos filtros da aplicação.
 * Ele fornece funcionalidades para:
 * - Gerenciar filtros por categoria (parques, restaurantes, etc.)
 * - Gerenciar filtros por faixa etária
 * - Gerenciar filtros por faixa de preço
 * - Gerenciar filtros por comodidades (trocadores, área de recreação, etc.)
 * - Limpar todos os filtros de uma vez
 *
 * O contexto é usado principalmente no componente FilterPanel e afeta a visualização
 * dos lugares no mapa e na lista de lugares.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { FilterValues } from '../../components/Filters/FilterPanel';

interface FilterContextType {
  filters: FilterValues;
  setFilters: (filters: FilterValues) => void;
  clearFilters: () => void;
}

const defaultFilters: FilterValues = {
  category: 'all',
  ageGroups: [],
  priceRange: [],
  amenities: {
    changingTables: false,
    playAreas: false,
    highChairs: false,
    accessibility: false,
  },
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  return (
    <FilterContext.Provider value={{ filters, setFilters, clearFilters }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
};
