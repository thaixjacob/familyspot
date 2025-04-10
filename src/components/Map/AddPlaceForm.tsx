import React from 'react';
import { NewPlaceDetails, PlaceAmenities } from './types';
import LoadingSpinner from '../../SharedComponents/Loading/LoadingSpinner';

interface AddPlaceFormProps {
  newPlaceDetails: NewPlaceDetails | null;
  newPlaceCategory: string;
  newPlacePriceRange: string;
  newPlaceActivityType: string;
  newPlaceAgeGroups: string[];
  newPlaceAmenities: PlaceAmenities;
  isCustomNameRequired: boolean;
  customPlaceName: string;
  categoryDetected: boolean;
  isLoadingPlaceDetails: boolean;
  onCategoryChange: (category: string) => void;
  onPriceRangeChange: (priceRange: string) => void;
  onActivityTypeChange: (activityType: string) => void;
  onAgeGroupChange: (ageGroups: string[]) => void;
  onAmenitiesChange: (amenities: PlaceAmenities) => void;
  onCustomNameChange: (name: string) => void;
  onCancel: () => void;
  onSave: () => void;
  isSaveDisabled: boolean;
}

const AddPlaceForm: React.FC<AddPlaceFormProps> = ({
  newPlaceDetails,
  newPlaceCategory,
  newPlacePriceRange,
  newPlaceActivityType,
  newPlaceAgeGroups,
  newPlaceAmenities,
  isCustomNameRequired,
  customPlaceName,
  categoryDetected,
  isLoadingPlaceDetails,
  onCategoryChange,
  onPriceRangeChange,
  onActivityTypeChange,
  onAgeGroupChange,
  onAmenitiesChange,
  onCustomNameChange,
  onCancel,
  onSave,
  isSaveDisabled,
}) => {
  return (
    <div className="space-y-3">
      <h3 className="font-bold">Adicionar Novo Local</h3>
      <p className="text-sm text-gray-600">
        Clique no mapa para selecionar um local
        {isLoadingPlaceDetails && (
          <span className="flex items-center ml-2">
            <LoadingSpinner size="sm" color="text-gray-600" />
            <span className="ml-2">Carregando detalhes...</span>
          </span>
        )}
      </p>

      {newPlaceDetails && (
        <div className="bg-gray-100 p-2 rounded mb-3">
          {isCustomNameRequired ? (
            <div className="mb-2">
              <label htmlFor="custom-name" className="block text-sm text-gray-600 mb-1">
                Nome do Local <span className="text-red-500">*</span>
                <span className="text-orange-500 text-xs ml-2">
                  (Forneça um nome para este local)
                </span>
              </label>
              <input
                id="custom-name"
                type="text"
                className="w-full p-2 border rounded"
                value={customPlaceName}
                onChange={e => onCustomNameChange(e.target.value)}
                placeholder="Ex: Café Familiar, Parque Infantil, etc."
                required
              />
            </div>
          ) : (
            <h4 className="font-semibold">{newPlaceDetails.name}</h4>
          )}
          <p className="text-sm text-gray-600">{newPlaceDetails.address}</p>
        </div>
      )}

      <div>
        <label htmlFor="place-category" className="block text-sm text-gray-600 mb-1">
          Categoria <span className="text-red-500">*</span>
          {!categoryDetected && newPlaceDetails && (
            <span className="text-orange-500 text-xs ml-2">
              (Por favor, selecione a categoria apropriada)
            </span>
          )}
        </label>
        <select
          id="place-category"
          className={`w-full p-2 border rounded mb-2 ${
            !categoryDetected && newPlaceDetails ? 'border-orange-400 bg-orange-50' : ''
          }`}
          value={newPlaceCategory}
          onChange={e => onCategoryChange(e.target.value)}
          aria-label="Categoria do local"
          required
        >
          <option value="" disabled>
            Selecione uma categoria
          </option>
          <option value="activities">Atividades</option>
          <option value="cafes">Cafés</option>
          <option value="parks">Parques</option>
          <option value="playgrounds">Playgrounds</option>
          <option value="restaurants">Restaurantes</option>
        </select>

        <label htmlFor="place-price" className="block text-sm text-gray-600 mb-1">
          Faixa de preço <span className="text-red-500">*</span>
        </label>
        <select
          id="place-price"
          className="w-full p-2 border rounded mb-2"
          value={newPlacePriceRange}
          onChange={e => onPriceRangeChange(e.target.value)}
          aria-label="Faixa de preço"
        >
          <option value="$">$ (Econômico)</option>
          <option value="$$">$$ (Moderado)</option>
          <option value="$$$">$$$ (Caro)</option>
          <option value="$$$$">$$$$ (Luxo)</option>
          <option value="free">Gratuito</option>
        </select>

        <label htmlFor="place-activity" className="block text-sm text-gray-600 mb-1">
          Tipo de atividade <span className="text-red-500">*</span>
        </label>
        <select
          id="place-activity"
          className="w-full p-2 border rounded mb-2"
          value={newPlaceActivityType}
          onChange={e => onActivityTypeChange(e.target.value)}
          aria-label="Tipo de atividade"
        >
          <option value="indoor">Ambiente fechado</option>
          <option value="outdoor">Ao ar livre</option>
          <option value="both">Ambos</option>
        </select>

        <fieldset className="mb-2">
          <legend className="block text-sm text-gray-600 mb-1">
            Faixas etárias <span className="text-red-500">*</span>
          </legend>
          <div className="grid grid-cols-2 gap-1">
            {['0-1', '1-3', '3-5', '5+'].map(age => (
              <label key={age} className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={newPlaceAgeGroups.includes(age)}
                  onChange={e => {
                    if (e.target.checked) {
                      onAgeGroupChange([...newPlaceAgeGroups, age]);
                    } else {
                      onAgeGroupChange(newPlaceAgeGroups.filter(a => a !== age));
                    }
                  }}
                />
                <span className="text-sm">{age} anos</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mb-2">
          <legend className="block text-sm text-gray-600 mb-1">Comodidades</legend>
          <div className="grid grid-cols-2 gap-1">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="mr-2"
                checked={newPlaceAmenities.changingTables}
                onChange={e =>
                  onAmenitiesChange({
                    ...newPlaceAmenities,
                    changingTables: e.target.checked,
                  })
                }
              />
              <span className="text-sm">Trocadores</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="mr-2"
                checked={newPlaceAmenities.playAreas}
                onChange={e =>
                  onAmenitiesChange({
                    ...newPlaceAmenities,
                    playAreas: e.target.checked,
                  })
                }
              />
              <span className="text-sm">Área de recreação</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="mr-2"
                checked={newPlaceAmenities.highChairs}
                onChange={e =>
                  onAmenitiesChange({
                    ...newPlaceAmenities,
                    highChairs: e.target.checked,
                  })
                }
              />
              <span className="text-sm">Cadeiras para crianças</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="mr-2"
                checked={newPlaceAmenities.accessibility}
                onChange={e =>
                  onAmenitiesChange({
                    ...newPlaceAmenities,
                    accessibility: e.target.checked,
                  })
                }
              />
              <span className="text-sm">Acessibilidade</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="mr-2"
                checked={newPlaceAmenities.kidsMenu}
                onChange={e =>
                  onAmenitiesChange({
                    ...newPlaceAmenities,
                    kidsMenu: e.target.checked,
                  })
                }
              />
              <span className="text-sm">Menu Infantil</span>
            </label>
          </div>
        </fieldset>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={onCancel}
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400"
        >
          Cancelar
        </button>

        <button
          onClick={onSave}
          disabled={isSaveDisabled}
          className={`px-4 py-2 rounded-md ${
            isSaveDisabled
              ? 'bg-blue-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          Salvar
        </button>
      </div>
    </div>
  );
};

export default AddPlaceForm;
