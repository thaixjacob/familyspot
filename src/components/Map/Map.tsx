import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { Place } from '../../types/Place';
import { useUser } from '../../App/ContextProviders/UserContext';
import { db } from '../../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import NotificationService from '../../App/Services/notificationService';
import LoadingSpinner from '../../SharedComponents/Loading/LoadingSpinner';
// Keep this as inline styles for Google Maps
const mapContainerStyle = {
  width: '100%',
  height: '100vh',
};

const center = {
  lat: 40.416775, // Set this to your target city
  lng: -3.70379,
};

// Bibliotecas necessárias para o Google Maps
const libraries: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places'];

interface MapProps {
  places: Place[];
  onPlaceAdded?: (place: Place) => void;
}

const Map = ({ places = [], onPlaceAdded }: MapProps) => {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [newPin, setNewPin] = useState<google.maps.LatLngLiteral | null>(null);
  const [newPlaceDetails, setNewPlaceDetails] = useState<{
    name: string;
    address: string;
    place_id: string;
  } | null>(null);
  const [newPlaceCategory, setNewPlaceCategory] = useState('');
  const [newPlaceAgeGroups, setNewPlaceAgeGroups] = useState<string[]>(['0-1', '1-3', '3-5', '5+']);
  const [newPlacePriceRange, setNewPlacePriceRange] = useState('$');
  const [newPlaceActivityType, setNewPlaceActivityType] = useState('outdoor');
  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [isLoadingPlaceDetails, setIsLoadingPlaceDetails] = useState(false);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const { state: userState } = useUser();
  const [categoryDetected, setCategoryDetected] = useState(false);
  const [newPlaceAmenities, setNewPlaceAmenities] = useState({
    changingTables: false,
    playAreas: false,
    highChairs: false,
    accessibility: false,
  });
  // Adicionar estados para nome personalizado
  const [isCustomNameRequired, setIsCustomNameRequired] = useState(false);
  const [customPlaceName, setCustomPlaceName] = useState('');

  useEffect(() => {
    if (!process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
      NotificationService.error('Google Maps API key is missing!');
      return;
    }
  }, []);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY as string,
    libraries: libraries as ('places' | 'drawing' | 'geometry' | 'visualization')[],
  });

  const onMapLoad = useCallback((map: google.maps.Map) => {
    placesServiceRef.current = new google.maps.places.PlacesService(map);
  }, []);

  // Função para mapear tipos do Google Places para suas categorias
  const mapGoogleTypesToCategory = (types: string[]): string | null => {
    if (types.includes('park')) return 'parks';
    if (types.includes('restaurant')) return 'restaurants';
    if (types.includes('cafe')) return 'cafes';
    if (types.includes('playground')) return 'playgrounds';
    // Retorna null se não encontrar correspondência
    return null;
  };

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (!isAddingPlace) return;

    const clickedLat = event.latLng?.lat();
    const clickedLng = event.latLng?.lng();

    if (clickedLat && clickedLng) {
      setNewPin({ lat: clickedLat, lng: clickedLng });

      // Buscar informações do local clicado
      if (placesServiceRef.current) {
        setIsLoadingPlaceDetails(true);

        const request = {
          location: new google.maps.LatLng(clickedLat, clickedLng),
          rankBy: google.maps.places.RankBy.DISTANCE,
          type: 'establishment',
        };

        placesServiceRef.current.nearbySearch(request, (results, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            results &&
            results.length > 0
          ) {
            // Pegar o primeiro resultado (o mais próximo)
            const place = results[0];

            // 2. Buscar detalhes completos
            placesServiceRef.current?.getDetails(
              {
                placeId: place.place_id as string,
                fields: ['name', 'formatted_address', 'place_id', 'types', 'business_status'],
              },
              (placeDetails, detailsStatus) => {
                setIsLoadingPlaceDetails(false);

                if (detailsStatus === google.maps.places.PlacesServiceStatus.OK && placeDetails) {
                  // 3. IMPORTANTE: Usar o nome do estabelecimento diretamente
                  const placeName = placeDetails.name || place.name || '';

                  setNewPlaceDetails({
                    name: placeName,
                    address: placeDetails.formatted_address || '',
                    place_id: placeDetails.place_id || '',
                  });

                  setIsCustomNameRequired(false);

                  const types = placeDetails.types || [];
                  const detectedCategory = mapGoogleTypesToCategory(types);

                  if (detectedCategory) {
                    setNewPlaceCategory(detectedCategory);
                    setCategoryDetected(true);
                  } else {
                    setNewPlaceCategory('');
                    setCategoryDetected(false);
                  }
                }
              }
            );
          } else {
            // Se não encontrou nenhum estabelecimento próximo
            setIsLoadingPlaceDetails(false);

            // Usar geocoder para obter o endereço
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode(
              { location: { lat: clickedLat, lng: clickedLng } },
              (results, status) => {
                if (status === 'OK' && results && results.length > 0) {
                  // Neste caso, não temos um nome de estabelecimento, então criamos um campo vazio
                  // para que o usuário possa digitar o nome
                  setNewPlaceDetails({
                    name: '',
                    address: results[0].formatted_address || '',
                    place_id: '',
                  });

                  // Aqui SIM precisamos solicitar um nome personalizado
                  setIsCustomNameRequired(true);
                }
              }
            );
          }
        });
      }
    }
  };

  const saveNewPlace = async () => {
    if (
      !newPin ||
      !newPlaceDetails ||
      !newPlaceCategory ||
      !userState.isAuthenticated ||
      (isCustomNameRequired && !customPlaceName) // Verificar se o nome personalizado é necessário e foi fornecido
    )
      return;

    try {
      const newPlace = {
        name: isCustomNameRequired ? customPlaceName : newPlaceDetails.name,
        description: '',
        address: newPlaceDetails.address,
        location: {
          latitude: newPin.lat,
          longitude: newPin.lng,
        },
        place_id: newPlaceDetails.place_id,
        category: newPlaceCategory,
        ageGroups: newPlaceAgeGroups,
        priceRange: newPlacePriceRange,
        amenities: newPlaceAmenities,
        verifications: 0,
        verifiedBy: [],
        createdBy: userState.email || 'anonymous',
        createdAt: new Date(),
        updatedAt: new Date(),
        activityType: newPlaceActivityType,
      };

      // Adicionar ao Firestore
      const docRef = await addDoc(collection(db, 'places'), newPlace);

      // Adicionar o ID gerado pelo Firestore
      const placeWithId = { ...newPlace, id: docRef.id };

      // Notificar o componente pai
      if (onPlaceAdded) {
        onPlaceAdded(placeWithId as Place);
      }

      // Reset all form fields
      setNewPin(null);
      setNewPlaceDetails(null);
      setNewPlaceCategory('');
      setNewPlaceAgeGroups(['0-1', '1-3', '3-5', '5+']);
      setNewPlacePriceRange('$');
      setNewPlaceActivityType('outdoor');
      setNewPlaceAmenities({
        changingTables: false,
        playAreas: false,
        highChairs: false,
        accessibility: false,
      });
      setIsAddingPlace(false);
      setCategoryDetected(false);
      setIsCustomNameRequired(false);
      setCustomPlaceName('');

      NotificationService.success('Local adicionado com sucesso!');
    } catch (error) {
      NotificationService.error(
        'Erro ao adicionar local:',
        error instanceof Error ? { message: error.message } : String(error)
      );
      NotificationService.error('Erro ao adicionar local. Tente novamente.');
    }
  };

  if (loadError || !isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-600 text-center">
          <LoadingSpinner size="lg" color="text-gray-600" />
          <p className="text-lg font-medium mt-4">Carregando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={13}
        center={center}
        onClick={handleMapClick}
        onLoad={onMapLoad}
      >
        {places.map(place => (
          <Marker
            key={place.id}
            position={{
              lat: place.location.latitude,
              lng: place.location.longitude,
            }}
            onClick={() => setSelectedPlace(place)}
          />
        ))}

        {newPin && (
          <Marker
            position={newPin}
            animation={google.maps.Animation.DROP}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
            }}
          />
        )}

        {selectedPlace && (
          <InfoWindow
            position={{
              lat: selectedPlace.location.latitude,
              lng: selectedPlace.location.longitude,
            }}
            onCloseClick={() => setSelectedPlace(null)}
          >
            <div className="p-2">
              <h3 className="font-bold text-lg">{selectedPlace.name}</h3>
              <p className="text-sm text-gray-600">{selectedPlace.category}</p>
              <p className="mt-1">{selectedPlace.description}</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-md z-10 max-w-md overflow-y-auto max-h-[90vh]">
        {!isAddingPlace ? (
          <button
            onClick={() => setIsAddingPlace(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            disabled={!userState.isAuthenticated}
          >
            {userState.isAuthenticated ? 'Adicionar Local' : 'Faça login para adicionar'}
          </button>
        ) : (
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
                      onChange={e => setCustomPlaceName(e.target.value)}
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
                onChange={e => {
                  setNewPlaceCategory(e.target.value);
                  setCategoryDetected(true); // Uma vez que o usuário escolhe, consideramos como "detectado"
                }}
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
                onChange={e => setNewPlacePriceRange(e.target.value)}
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
                onChange={e => setNewPlaceActivityType(e.target.value)}
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
                            setNewPlaceAgeGroups([...newPlaceAgeGroups, age]);
                          } else {
                            setNewPlaceAgeGroups(newPlaceAgeGroups.filter(a => a !== age));
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
                        setNewPlaceAmenities({
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
                        setNewPlaceAmenities({
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
                        setNewPlaceAmenities({
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
                        setNewPlaceAmenities({
                          ...newPlaceAmenities,
                          accessibility: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm">Acessibilidade</span>
                  </label>
                </div>
              </fieldset>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setIsAddingPlace(false);
                  setNewPin(null);
                  setNewPlaceDetails(null);
                  setIsCustomNameRequired(false);
                  setCustomPlaceName('');
                }}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancelar
              </button>

              <button
                onClick={saveNewPlace}
                disabled={
                  !newPin ||
                  !newPlaceDetails ||
                  !newPlaceCategory ||
                  (isCustomNameRequired && !customPlaceName)
                }
                className={`px-4 py-2 rounded-md ${
                  !newPin ||
                  !newPlaceDetails ||
                  !newPlaceCategory ||
                  (isCustomNameRequired && !customPlaceName)
                    ? 'bg-blue-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                Salvar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Map;
