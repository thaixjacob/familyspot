import React, { useState } from 'react';

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

const FilterPanel = ({ onFilter }: { onFilter: (filters: FilterValues) => void }) => {
  const [category, setCategory] = useState('all');
  const [ageGroups, setAgeGroups] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string[]>([]);
  const [amenities, setAmenities] = useState({
    changingTables: false,
    playAreas: false,
    highChairs: false,
    accessibility: false,
  });

  const handleAgeGroupChange = (age: string) => {
    setAgeGroups(ageGroups.includes(age) ? ageGroups.filter(a => a !== age) : [...ageGroups, age]);
  };

  const handlePriceRangeChange = (price: string) => {
    setPriceRange(
      priceRange.includes(price) ? priceRange.filter(p => p !== price) : [...priceRange, price]
    );
  };

  const handleAmenityChange = (
    amenity: 'changingTables' | 'playAreas' | 'highChairs' | 'accessibility'
  ) => {
    setAmenities({
      ...amenities,
      [amenity]: !amenities[amenity],
    });
  };

  const applyFilters = () => {
    onFilter({
      category,
      ageGroups,
      priceRange,
      amenities,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-5 max-w-md">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Filters</h3>

      <div className="mb-5">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          <label htmlFor="category-select">Category</label>
        </h4>
        <select
          id="category-select"
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Categories</option>
          <option value="parks">Parks</option>
          <option value="restaurants">Restaurants</option>
          <option value="activities">Activities</option>
          <option value="playgrounds">Playgrounds</option>
          <option value="cafes">Cafes</option>
        </select>
      </div>

      <div className="mb-5">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Age Groups</h4>
        <div className="space-y-2">
          {['0-1', '1-3', '3-5', '5+'].map(age => (
            <label key={age} className="flex items-center">
              <input
                type="checkbox"
                checked={ageGroups.includes(age)}
                onChange={() => handleAgeGroupChange(age)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{age} years</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Price Range</h4>
        <div className="flex flex-wrap gap-2">
          {['$', '$$', '$$$', '$$$$'].map(price => (
            <button
              key={price}
              onClick={() => handlePriceRangeChange(price)}
              className={`px-3 py-1 text-sm border rounded-full ${
                priceRange.includes(price)
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
        <h4 className="text-sm font-medium text-gray-700 mb-2">Amenities</h4>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={amenities.changingTables}
              onChange={() => handleAmenityChange('changingTables')}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Changing Tables</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={amenities.playAreas}
              onChange={() => handleAmenityChange('playAreas')}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Play Areas</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={amenities.highChairs}
              onChange={() => handleAmenityChange('highChairs')}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">High Chairs</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={amenities.accessibility}
              onChange={() => handleAmenityChange('accessibility')}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Accessibility</span>
          </label>
        </div>
      </div>

      <button
        onClick={applyFilters}
        className="w-full py-2.5 px-5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-colors"
      >
        Apply Filters
      </button>
    </div>
  );
};

export default FilterPanel;
