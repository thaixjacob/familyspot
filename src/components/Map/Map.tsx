import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { Place } from '../../types/Place';
import { useUser } from '../../App/ContextProviders/UserContext';
import { db } from '../../firebase/config';
import { collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import NotificationService from '../../App/Services/notificationService';
import LoadingSpinner from '../../SharedComponents/Loading/LoadingSpinner';
import ErrorBoundary from '../../SharedComponents/ErrorBoundary/ErrorBoundary';
import LocationPermissionDialog from './LocationPermissionDialog';
import LocationPermissionDialogMobile from './LocationPermissionDialogMobile';
import { auth } from '../../firebase/config';
import { logError } from '../../utils/logger';
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
const libraries: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places', 'geometry'];

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
    kidsMenu: false,
  });
  // Adicionar estados para nome personalizado
  const [isCustomNameRequired, setIsCustomNameRequired] = useState(false);
  const [customPlaceName, setCustomPlaceName] = useState('');
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
  const [isNearbyMode, setIsNearbyMode] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const lastClickTime = useRef<number>(0);
  const COOLDOWN_DURATION = 30000; // 30 segundos em milissegundos
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
      NotificationService.error('Google Maps API key is missing!');
      return;
    }
  }, []);

  const proceedWithGeolocation = useCallback(() => {
    setIsLocationLoading(true);
    setIsNearbyMode(true);
    lastClickTime.current = Date.now();

    navigator.geolocation.getCurrentPosition(
      position => {
        const userPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setUserLocation(userPos);

        if (!google.maps.geometry || !google.maps.geometry.spherical) {
          NotificationService.error(
            'Biblioteca de geometria não está disponível. Por favor, tente novamente.'
          );
          setIsLocationLoading(false);
          return;
        }

        const nearby = places.filter(place => {
          const placePos = {
            lat: place.location.latitude,
            lng: place.location.longitude,
          };
          const distance = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(userPos.lat, userPos.lng),
            new google.maps.LatLng(placePos.lat, placePos.lng)
          );
          return distance <= 5000;
        });

        setNearbyPlaces(nearby);

        if (nearby.length === 0) {
          NotificationService.info('Nenhum lugar encontrado. Que tal adicionar um novo lugar?');
        } else {
          NotificationService.success(`Encontramos ${nearby.length} lugares próximos a você!`);
        }

        setIsLocationLoading(false);
      },
      error => {
        logError(error, 'map_geolocation_error');
        NotificationService.error('Não foi possível obter sua localização:', error.message);
        setIsNearbyMode(false);
        setIsLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }, [places]);

  const checkBrowserPermission = useCallback(async () => {
    try {
      // Se o usuário estiver autenticado, verificar primeiro a permissão no Firestore
      if (userState.isAuthenticated && auth.currentUser) {
        const userPrefDoc = await getDoc(doc(db, 'userPreferences', auth.currentUser.uid));
        if (userPrefDoc.exists()) {
          const userData = userPrefDoc.data();
          if (userData.locationPermission) {
            return true;
          }
        }
      }

      // Se não estiver autenticado ou não tiver permissão no Firestore, verificar permissão do navegador
      const permission = await navigator.permissions.query({ name: 'geolocation' });

      if (permission.state === 'granted') {
        return true;
      }

      return false;
    } catch (error) {
      logError(error, 'map_browser_permission_error');
      return false;
    }
  }, [userState.isAuthenticated]);

  const handleNearMeClick = useCallback(
    async (hasPermission = false) => {
      const now = Date.now();
      const timeSinceLastClick = now - lastClickTime.current;

      if (timeSinceLastClick < COOLDOWN_DURATION) {
        const remainingTime = Math.ceil((COOLDOWN_DURATION - timeSinceLastClick) / 1000);
        NotificationService.warning(
          `Por favor, aguarde ${remainingTime} segundos antes de tentar novamente.`
        );
        return;
      }

      if (!navigator.geolocation) {
        NotificationService.error('Geolocalização não é suportada pelo seu navegador');
        return;
      }

      // Se já temos permissão do navegador, não precisamos verificar o Firestore
      if (hasPermission) {
        proceedWithGeolocation();
        return;
      }

      // Se não sabemos se o usuário tem permissão, verificamos primeiro o navegador
      if (hasLocationPermission === null) {
        const browserHasPermission = await checkBrowserPermission();
        if (browserHasPermission) {
          proceedWithGeolocation();
          return;
        }
      }

      // Se chegou aqui, precisamos mostrar o diálogo
      setShowPermissionDialog(true);
    },
    [proceedWithGeolocation, hasLocationPermission, checkBrowserPermission]
  );

  useEffect(() => {
    const checkLocationPermission = async () => {
      try {
        // Se o usuário estiver autenticado, verificar primeiro a permissão no Firestore
        if (userState.isAuthenticated && auth.currentUser) {
          try {
            const userPrefRef = doc(db, 'userPreferences', auth.currentUser.uid);
            const userPrefDoc = await getDoc(userPrefRef);

            if (!userPrefDoc.exists()) {
              await setDoc(userPrefRef, {
                locationPermission: false,
                updatedAt: new Date(),
              });
              return false;
            }

            const userData = userPrefDoc.data();

            if (userData.locationPermission) {
              handleNearMeClick(true);
              return true;
            }
          } catch (firestoreError) {
            logError(firestoreError, 'map_firestore_access_error');
            // Mesmo com erro no Firestore, continuamos para verificar a permissão do navegador
          }
        }

        // Se não estiver autenticado ou não tiver permissão no Firestore, verificar permissão do navegador
        const permission = await navigator.permissions.query({ name: 'geolocation' });

        if (permission.state === 'granted') {
          handleNearMeClick(true);
          return true;
        }

        return false;
      } catch (error) {
        logError(error, 'map_permission_check_error');
        return false;
      }
    };

    checkLocationPermission();
  }, [userState.isAuthenticated, handleNearMeClick]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
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
        kidsMenu: false,
      });
      setIsAddingPlace(false);
      setCategoryDetected(false);
      setIsCustomNameRequired(false);
      setCustomPlaceName('');

      NotificationService.success('Local adicionado com sucesso!');
    } catch (error) {
      logError(error, 'map_permission_save_error');
      NotificationService.error(
        'Erro ao adicionar local:',
        error instanceof Error ? { message: error.message } : String(error)
      );
      NotificationService.error('Erro ao adicionar local. Tente novamente.');
    }
  };

  const handlePermissionGranted = async () => {
    setHasLocationPermission(true);
    setShowPermissionDialog(false);

    if (auth.currentUser) {
      try {
        const userPrefRef = doc(db, 'userPreferences', auth.currentUser.uid);
        await setDoc(
          userPrefRef,
          {
            locationPermission: true,
            updatedAt: new Date(),
          },
          { merge: true }
        );
      } catch (error) {
        logError(error, 'map_permission_save_error');
        // Mesmo com erro ao salvar, continuamos com a geolocalização
      }
    }

    proceedWithGeolocation();
  };

  const handlePermissionDenied = async () => {
    setHasLocationPermission(false);
    setShowPermissionDialog(false);

    if (auth.currentUser) {
      try {
        const userPrefRef = doc(db, 'userPreferences', auth.currentUser.uid);
        await setDoc(
          userPrefRef,
          {
            locationPermission: false,
            updatedAt: new Date(),
          },
          { merge: true }
        );
      } catch (error) {
        logError(error, 'map_permission_save_error');
      }
    }

    NotificationService.error('A funcionalidade "Próximo a Mim" requer permissão de localização.');
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
        center={userLocation || center}
        onClick={handleMapClick}
        onLoad={onMapLoad}
      >
        {(isNearbyMode ? nearbyPlaces : places).map(place => (
          <Marker
            key={place.id}
            position={{
              lat: place.location.latitude,
              lng: place.location.longitude,
            }}
            onClick={() => setSelectedPlace(place)}
          />
        ))}

        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
            }}
          />
        )}

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

      {showPermissionDialog &&
        (isMobile ? (
          <LocationPermissionDialogMobile
            onPermissionGranted={handlePermissionGranted}
            onPermissionDenied={handlePermissionDenied}
          />
        ) : (
          <LocationPermissionDialog
            onPermissionGranted={handlePermissionGranted}
            onPermissionDenied={handlePermissionDenied}
          />
        ))}

      <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-md z-10 max-w-md overflow-y-auto max-h-[90vh]">
        {!isAddingPlace ? (
          <ErrorBoundary
            fallback={
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <h3 className="text-red-800 font-medium mb-2">Ops! Algo deu errado</h3>
                  <p className="text-red-600 text-sm mb-3">
                    Ocorreu um erro inesperado. Por favor, tente novamente.
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Recarregar
                  </button>
                </div>
              </div>
            }
          >
            <>
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setIsAddingPlace(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  disabled={!userState.isAuthenticated}
                >
                  {userState.isAuthenticated ? 'Adicionar Local' : 'Faça login para adicionar'}
                </button>
                <button
                  onClick={() => handleNearMeClick()}
                  className={`px-4 py-2 rounded-md ${
                    isLocationLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isLocationLoading ? (
                    <span className="flex items-center">
                      <LoadingSpinner size="sm" color="text-white" />
                      <span className="ml-2">Buscando...</span>
                    </span>
                  ) : (
                    'Próximo a Mim'
                  )}
                </button>
              </div>
              {isNearbyMode && nearbyPlaces.length > 0 && (
                <div className="text-sm text-gray-600 mb-2">
                  Mostrando {nearbyPlaces.length} lugares próximos a você
                </div>
              )}
            </>
          </ErrorBoundary>
        ) : (
          <ErrorBoundary
            fallback={
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <h3 className="text-red-800 font-medium mb-2">Erro ao adicionar local</h3>
                  <p className="text-red-600 text-sm mb-3">
                    Ocorreu um erro ao processar o formulário. Por favor, tente novamente.
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setIsAddingPlace(false)}
                    className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Recarregar
                  </button>
                </div>
              </div>
            }
          >
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
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={newPlaceAmenities.kidsMenu}
                        onChange={e =>
                          setNewPlaceAmenities({
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
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
};

export default Map;
