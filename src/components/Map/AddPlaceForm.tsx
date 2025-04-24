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
  isSaving: boolean;
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

interface AmenityItem {
  key: string;
  label: string;
}

interface AmenitiesByCategory {
  [key: string]: AmenityItem[];
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
  isSaving,
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
  const [showValidationErrors, setShowValidationErrors] = React.useState(false);

  React.useEffect(() => {
    if (!newPlaceDetails) {
      setShowValidationErrors(false);
    }
  }, [newPlaceDetails]);

  const getAmenitiesForCategory = (): AmenitiesByCategory => {
    switch (newPlaceCategory) {
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

  const validateForm = (): boolean => {
    // Validações básicas que se aplicam a todas as categorias
    if (!newPlaceDetails || !newPlaceCategory || newPlaceAgeGroups.length === 0) {
      return false;
    }

    // Validação de nome personalizado se necessário
    if (isCustomNameRequired && !customPlaceName) {
      return false;
    }

    // Validações específicas por categoria
    switch (newPlaceCategory) {
      case 'activities':
      case 'cafes':
      case 'restaurants':
        // Para estas categorias, preço e tipo de ambiente são obrigatórios
        if (!newPlacePriceRange || !newPlaceActivityType) {
          return false;
        }
        break;
      case 'parks':
      case 'playgrounds':
        // Para estas categorias, apenas as validações básicas se aplicam
        break;
    }

    return true;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave();
    } else {
      setShowValidationErrors(true);
    }
  };

  const amenities = getAmenitiesForCategory();

  return (
    <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
      <div className="flex justify-between items-center sticky top-0 bg-white py-2 z-10">
        <h3 className="font-bold">Adicionar Novo Local</h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 p-1"
          aria-label="Fechar formulário"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      <div className="text-sm text-gray-600">
        Clique no mapa para selecionar um local
        {isLoadingPlaceDetails && (
          <div className="flex items-center ml-2">
            <LoadingSpinner size="sm" color="text-gray-600" />
            <span className="ml-2">Carregando detalhes...</span>
          </div>
        )}
      </div>

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

      {/* Informações Básicas */}
      <div>
        <h4 className="font-semibold text-gray-700">Informações Básicas</h4>
        {showValidationErrors && !newPlaceCategory && (
          <span className="text-orange-500 text-xs">Selecione a categoria*</span>
        )}
        <label htmlFor="place-category" className="block text-sm text-gray-600 mb-1">
          {!categoryDetected && newPlaceDetails && (
            <span className="text-orange-500 text-xs">Selecione a categoria apropriada</span>
          )}
        </label>
        <select
          id="place-category"
          className={`w-full p-2 border rounded mb-2 ${
            (!categoryDetected && newPlaceDetails) || (showValidationErrors && !newPlaceCategory)
              ? 'border-orange-400'
              : ''
          }`}
          value={newPlaceCategory}
          onChange={e => onCategoryChange(e.target.value)}
          aria-label="Categoria do local"
          required
        >
          <option value="" disabled>
            Categoria*
          </option>
          <option value="activities">Atividades</option>
          <option value="cafes">Cafés</option>
          <option value="parks">Parques</option>
          <option value="playgrounds">Playgrounds</option>
          <option value="restaurants">Restaurantes</option>
        </select>

        {/* Faixa Etária */}
        <div className="space-y-2">
          <h5 className="font-semibold text-gray-700 text-sm">Faixa Etária</h5>
          {showValidationErrors && newPlaceAgeGroups.length === 0 && (
            <span className="text-orange-500 text-xs">Selecione pelo menos uma faixa etária</span>
          )}
          <div
            className={`grid grid-cols-2 gap-2 ${showValidationErrors && newPlaceAgeGroups.length === 0 ? 'border-orange-400 rounded' : ''}`}
          >
            {['0-1', '1-3', '3-5', '5+'].map(age => (
              <label key={age} className="flex items-center p-2 border rounded hover:bg-gray-50">
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
        </div>

        {/* Preço e Tipo de Atividade - Apenas para cafés, restaurantes e atividades */}
        {(newPlaceCategory === 'cafes' ||
          newPlaceCategory === 'restaurants' ||
          newPlaceCategory === 'activities') && (
          <>
            <div className="space-y-2 mt-1">
              {showValidationErrors && !newPlacePriceRange && (
                <span className="text-orange-500 text-xs">Selecione o preço</span>
              )}
              <select
                className={`w-full p-2 border rounded mb-2 mt-1 ${
                  showValidationErrors && !newPlacePriceRange ? 'border-orange-400' : ''
                }`}
                value={newPlacePriceRange}
                onChange={e => onPriceRangeChange(e.target.value)}
                aria-label="Preço"
              >
                <option value="" disabled>
                  Preço*
                </option>
                <option value="$">$</option>
                <option value="$$">$$</option>
                <option value="$$$">$$$</option>
                <option value="$$$$">$$$$</option>
                <option value="free">Gratuito</option>
              </select>
            </div>

            <div className="space-y-2 mt-1">
              {showValidationErrors && !newPlaceActivityType && (
                <span className="text-orange-500 text-xs">Selecione o tipo de ambiente</span>
              )}
              <select
                className={`w-full p-2 border rounded ${
                  showValidationErrors && !newPlaceActivityType ? 'border-orange-400' : ''
                }`}
                value={newPlaceActivityType}
                onChange={e => onActivityTypeChange(e.target.value)}
              >
                <option value="" disabled>
                  Tipo de ambiente*
                </option>
                <option value="indoor">Ambiente fechado</option>
                <option value="outdoor">Ao ar livre</option>
                <option value="both">Ambos</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Comodidades */}
      {newPlaceCategory && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-700">Comodidades</h4>
          <div className="space-y-2">
            {Object.entries(amenities).map(([category, items]: [string, AmenityItem[]]) => (
              <div key={category} className="space-y-2">
                <details className="border rounded">
                  <summary className="p-2 cursor-pointer">
                    {category === 'accessibility' && '♿ Acessibilidade'}
                    {category === 'structure' && '🧺 Estrutura'}
                    {category === 'transport' && '🚗 Transporte'}
                    {category === 'facilities' && '🍔 Alimentação'}
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
                          checked={Boolean(
                            newPlaceAmenities[key as keyof typeof newPlaceAmenities]
                          )}
                          onChange={e =>
                            onAmenitiesChange({
                              ...newPlaceAmenities,
                              [key]: e.target.checked,
                            })
                          }
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

      {/* Ações */}
      <div className="flex justify-end space-x-2 pt-4 sticky bottom-0 bg-white py-2 z-10">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          disabled={isSaving}
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || isSaveDisabled}
          className={`px-4 py-2 rounded flex items-center justify-center min-w-[100px] ${
            isSaving || isSaveDisabled
              ? 'bg-blue-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isSaving ? (
            <>
              <LoadingSpinner size="sm" color="text-white" />
              <span className="ml-2">Salvando...</span>
            </>
          ) : (
            'Salvar'
          )}
        </button>
      </div>
    </div>
  );
};

export default AddPlaceForm;
