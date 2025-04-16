import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import { useUser } from '../../App/ContextProviders/UserContext';
import { db } from '../../firebase/config';
import { collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import NotificationService from '../../App/Services/notificationService';
import LoadingSpinner from '../../SharedComponents/Loading/LoadingSpinner';
import ErrorBoundary from '../../SharedComponents/ErrorBoundary/ErrorBoundary';
import { auth } from '../../firebase/config';
import { logError } from '../../utils/logger';
import { Place } from '../../types/Place';
import { MapState } from './types';
import { mapContainerStyle, center, libraries } from './styles';
import {
  mapGoogleTypesToCategory,
  calculateNearbyPlaces,
  getPlaceDetails,
  fetchPlacesInBounds,
  isBoundsChangeSignificant,
  calculateBoundsCenterDistance,
} from './utils';
import MapControls from './MapControls';
import AddPlaceForm from './AddPlaceForm';
import { CATEGORY_COLORS, CATEGORY_ICONS } from './constants';
import MapStatusIndicator from './MapStatusIndicator';

interface MapProps {
  places: Place[];
  onPlaceAdded: (newPlace: Place) => void;
  onMapLoad?: (map: google.maps.Map) => void;
  onNearbyPlacesUpdate?: (places: Place[]) => void;
  activeFilters?: {
    category?: string;
    ageGroups?: string[];
    priceRange?: string[];
    amenities?: {
      changingTables?: boolean;
      playAreas?: boolean;
      highChairs?: boolean;
      accessibility?: boolean;
      kidsMenu?: boolean;
    };
  };
}

const Map = ({
  places = [],
  onPlaceAdded,
  onMapLoad,
  onNearbyPlacesUpdate,
  activeFilters = {},
}: MapProps) => {
  const [state, setState] = useState<MapState>({
    selectedPlace: null,
    newPin: null,
    newPlaceDetails: null,
    newPlaceCategory: '',
    newPlaceAgeGroups: ['0-1', '1-3', '3-5', '5+'],
    newPlacePriceRange: '$',
    newPlaceActivityType: 'outdoor',
    newPlaceAmenities: {
      changingTables: false,
      playAreas: false,
      highChairs: false,
      accessibility: false,
      kidsMenu: false,
    },
    isAddingPlace: false,
    isLoadingPlaceDetails: false,
    categoryDetected: false,
    isCustomNameRequired: false,
    customPlaceName: '',
    userLocation: null,
    allPlaces: places,
    nearbyPlaces: [],
    isNearbyMode: false,
    hasLocationPermission: null,
    isLocationLoading: false,
    currentMapBounds: null,
    needsPlaceUpdate: false,
    visiblePlaces: places,
    isLoadingMapData: false,
    lastQueriedBounds: null,
    minPanDistanceThreshold: 500,
    overlapThreshold: 0.3,
    isPanning: false,
  });

  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const { state: userState } = useUser();
  const lastClickTime = useRef<number>(0);
  const COOLDOWN_DURATION = 30000;
  const locationCheckIdRef = useRef<string | null>(null);
  const boundsChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapListenersRef = useRef<google.maps.MapsEventListener[]>([]);

  const lastQueriedBoundsRef = useRef<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);

  // Referência para armazenar os filtros atuais
  const currentFiltersRef = useRef(activeFilters);

  useEffect(() => {
    if (!process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
      NotificationService.error('Google Maps API key is missing!');
      return;
    }
  }, []);

  useEffect(() => {
    // Atualiza os lugares visíveis no mapa
    setState(prevState => ({
      ...prevState,
      allPlaces: places,
      nearbyPlaces: places, // Atualiza também os lugares próximos
    }));
  }, [places]);

  const proceedWithGeolocation = useCallback(() => {
    setState(prev => ({ ...prev, isLocationLoading: true, isNearbyMode: true }));

    navigator.geolocation.getCurrentPosition(
      position => {
        const userPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setState(prev => ({ ...prev, userLocation: userPos }));

        const nearby = calculateNearbyPlaces(userPos, places);

        setState(prev => ({
          ...prev,
          nearbyPlaces: nearby,
          isLocationLoading: false,
        }));

        if (onNearbyPlacesUpdate) {
          onNearbyPlacesUpdate(nearby);
        }

        if (userState.isAuthenticated) {
          if (nearby.length === 0) {
            NotificationService.info(
              'Não encontramos lugares próximos a você em um raio de 10km. Você pode tentar aumentar o zoom do mapa para ver mais lugares ou adicionar um novo lugar para ajudar outras famílias!'
            );
          } else {
            NotificationService.success(
              `Ótimo! Encontramos ${nearby.length} lugares próximos a você em um raio de 10km!`
            );
          }
        }
      },
      error => {
        logError(error, 'map_geolocation_error');
        if (userState.isAuthenticated) {
          NotificationService.error(
            'Não conseguimos acessar sua localização. Verifique se o GPS está ativado e se você permitiu o acesso à localização.'
          );
        }
        setState(prev => ({ ...prev, isNearbyMode: false, isLocationLoading: false }));
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }, [places, userState.isAuthenticated, onNearbyPlacesUpdate]);

  const checkBrowserPermission = useCallback(async () => {
    try {
      if (userState.isAuthenticated && auth.currentUser) {
        const userPrefDoc = await getDoc(doc(db, 'userPreferences', auth.currentUser.uid));
        if (userPrefDoc.exists()) {
          const userData = userPrefDoc.data();
          if (userData.locationPermission) {
            return true;
          }
        }
      }

      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state === 'granted';
    } catch (error) {
      logError(error, 'map_browser_permission_error');
      return false;
    }
  }, [userState.isAuthenticated]);

  const handleNearMeClick = useCallback(
    async (hasPermission = false, isManualClick = false) => {
      if (isManualClick) {
        const now = Date.now();
        const timeSinceLastClick = now - lastClickTime.current;

        if (timeSinceLastClick < COOLDOWN_DURATION && userState.isAuthenticated) {
          const remainingTime = Math.ceil((COOLDOWN_DURATION - timeSinceLastClick) / 1000);
          NotificationService.warning(
            `Por favor, aguarde ${remainingTime} segundos antes de tentar novamente.`
          );
          return;
        }

        lastClickTime.current = now;
      }

      if (!navigator.geolocation) {
        NotificationService.error(
          'Parece que seu navegador não suporta geolocalização. Tente usar um navegador mais recente.'
        );
        return;
      }

      if (hasPermission) {
        proceedWithGeolocation();
        return;
      }

      if (state.hasLocationPermission === null) {
        const browserHasPermission = await checkBrowserPermission();
        if (browserHasPermission) {
          proceedWithGeolocation();
          return;
        }
      }

      navigator.geolocation.getCurrentPosition(
        () => {
          setState(prev => ({ ...prev, hasLocationPermission: true }));
          proceedWithGeolocation();
        },
        () => {
          setState(prev => ({ ...prev, hasLocationPermission: false }));
          NotificationService.error(
            'Para usar a funcionalidade "Próximo a Mim", precisamos que você permita o seu navegador a acessar sua localização.'
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    },
    [
      proceedWithGeolocation,
      state.hasLocationPermission,
      checkBrowserPermission,
      userState.isAuthenticated,
    ]
  );

  useEffect(() => {
    const checkLocationPermission = async () => {
      if (!userState.isAuthenticated || locationCheckIdRef.current) return;

      locationCheckIdRef.current = Date.now().toString();

      try {
        if (auth.currentUser) {
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
              handleNearMeClick(true, false);
              return true;
            }
          } catch (firestoreError) {
            logError(firestoreError, 'map_firestore_access_error');
          }
        }

        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'granted') {
          handleNearMeClick(true, false);
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
    // Cleanup function para remover listeners quando o componente desmontar
    return () => {
      if (boundsChangeTimeoutRef.current) {
        clearTimeout(boundsChangeTimeoutRef.current);
      }

      // Remover todos os listeners de mapa registrados
      mapListenersRef.current.forEach(listener => {
        google.maps.event.removeListener(listener);
      });
      mapListenersRef.current = [];
    };
  }, []);

  const applyFiltersToPlaces = useCallback(
    (placesToFilter: Place[]) => {
      return placesToFilter.filter(place => {
        if (activeFilters.category && place.category !== activeFilters.category) {
          return false;
        }

        if (activeFilters.ageGroups?.length) {
          const hasMatchingAgeGroup = place.ageGroups.some(age =>
            activeFilters.ageGroups?.includes(age)
          );
          if (!hasMatchingAgeGroup) return false;
        }

        if (
          activeFilters.priceRange?.length &&
          !activeFilters.priceRange.includes(place.priceRange)
        ) {
          return false;
        }

        if (activeFilters.amenities) {
          for (const [key, value] of Object.entries(activeFilters.amenities)) {
            if (value && !place.amenities[key as keyof typeof place.amenities]) {
              return false;
            }
          }
        }

        return true;
      });
    },
    [activeFilters]
  );

  // Adicionar useEffect para monitorar mudanças nos filtros
  useEffect(() => {
    // Verificar se os filtros realmente mudaram
    const filtersChanged =
      JSON.stringify(activeFilters) !== JSON.stringify(currentFiltersRef.current);

    if (filtersChanged && state.currentMapBounds) {
      currentFiltersRef.current = activeFilters;
      setState(prev => ({
        ...prev,
        needsPlaceUpdate: true,
      }));
    }
  }, [activeFilters, state.currentMapBounds]);

  useEffect(() => {
    if (state.needsPlaceUpdate && state.currentMapBounds !== null) {
      const loadPlacesInView = async () => {
        setState(prev => ({ ...prev, isLoadingMapData: true }));

        try {
          const placesInBounds = await fetchPlacesInBounds(state.currentMapBounds);
          const filteredPlaces = applyFiltersToPlaces(placesInBounds);

          if (
            state.currentMapBounds &&
            typeof state.currentMapBounds.north === 'number' &&
            typeof state.currentMapBounds.south === 'number' &&
            typeof state.currentMapBounds.east === 'number' &&
            typeof state.currentMapBounds.west === 'number'
          ) {
            lastQueriedBoundsRef.current = {
              north: state.currentMapBounds.north,
              south: state.currentMapBounds.south,
              east: state.currentMapBounds.east,
              west: state.currentMapBounds.west,
            };
          }

          setState(prev => ({
            ...prev,
            visiblePlaces: filteredPlaces,
            needsPlaceUpdate: false,
            isLoadingMapData: false,
          }));

          if (onNearbyPlacesUpdate) {
            onNearbyPlacesUpdate(filteredPlaces);
          }

          if (userState.isAuthenticated && filteredPlaces.length > 0) {
            NotificationService.info(
              `Encontramos ${filteredPlaces.length} lugares na área visível do mapa.`
            );
          }
        } catch (error) {
          logError(error, 'load_places_in_view_error');
          setState(prev => ({ ...prev, isLoadingMapData: false }));
        }
      };

      loadPlacesInView();
    }
  }, [
    state.needsPlaceUpdate,
    state.currentMapBounds,
    onNearbyPlacesUpdate,
    userState.isAuthenticated,
    applyFiltersToPlaces,
  ]);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY as string,
    libraries: libraries as ('places' | 'drawing' | 'geometry' | 'visualization')[],
  });

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      placesServiceRef.current = new google.maps.places.PlacesService(map);

      // Ajusta o zoom inicial se necessário
      if (places.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        places.forEach(place => {
          bounds.extend({
            lat: place.location.latitude,
            lng: place.location.longitude,
          });
        });
        map.fitBounds(bounds);
      }

      const boundsChangedListener = map.addListener('bounds_changed', () => {
        // Se a última atualização foi menos de 300ms atrás, ignorar para evitar excesso de updates
        if (boundsChangeTimeoutRef.current) {
          clearTimeout(boundsChangeTimeoutRef.current);
        }

        // Usar debounce para atualizar os bounds apenas quando o usuário parar de mover o mapa
        boundsChangeTimeoutRef.current = setTimeout(() => {
          const bounds = map.getBounds();
          if (bounds) {
            const northEast = bounds.getNorthEast();
            const southWest = bounds.getSouthWest();

            if (northEast && southWest) {
              const newBounds = {
                north: northEast.lat(),
                south: southWest.lat(),
                east: northEast.lng(),
                west: southWest.lng(),
              };

              // Usar o ref para comparação
              const isSignificant = isBoundsChangeSignificant(
                lastQueriedBoundsRef.current,
                newBounds,
                state.overlapThreshold
              );

              const distance = calculateBoundsCenterDistance(
                lastQueriedBoundsRef.current,
                newBounds
              );
              const isDistanceSignificant = distance > state.minPanDistanceThreshold;
              const shouldUpdate = isSignificant || isDistanceSignificant;

              setState(prev => ({
                ...prev,
                currentMapBounds: newBounds,
                needsPlaceUpdate: shouldUpdate,
              }));
            }
          }
        }, 300);
      });

      // Armazenar referência ao listener para limpeza posterior
      mapListenersRef.current.push(boundsChangedListener);

      // Chama callback onMapLoad se fornecido
      if (onMapLoad) {
        onMapLoad(map);
      }

      const dragStartListener = map.addListener('dragstart', () => {
        setState(prev => ({ ...prev, isPanning: true }));
      });

      const dragEndListener = map.addListener('dragend', () => {
        // Um pequeno atraso para dar feedback visual suficiente ao usuário
        setTimeout(() => {
          setState(prev => ({ ...prev, isPanning: false }));
        }, 300);
      });

      mapListenersRef.current.push(dragStartListener);
      mapListenersRef.current.push(dragEndListener);
    },
    [onMapLoad, places, state.minPanDistanceThreshold, state.overlapThreshold]
  );

  const handleMapClick = async (event: google.maps.MapMouseEvent) => {
    if (!state.isAddingPlace || !placesServiceRef.current) return;

    const clickedLat = event.latLng?.lat();
    const clickedLng = event.latLng?.lng();

    if (!clickedLat || !clickedLng) return;

    setState(prev => ({ ...prev, newPin: { lat: clickedLat, lng: clickedLng } }));
    setState(prev => ({ ...prev, isLoadingPlaceDetails: true }));

    const placeDetails = await getPlaceDetails(placesServiceRef.current, {
      lat: clickedLat,
      lng: clickedLng,
    });

    if (placeDetails) {
      const detectedCategory = mapGoogleTypesToCategory(placeDetails.types);
      setState(prev => ({
        ...prev,
        newPlaceDetails: {
          name: placeDetails.name,
          address: placeDetails.address,
          place_id: placeDetails.place_id,
        },
        newPlaceCategory: detectedCategory || '',
        categoryDetected: !!detectedCategory,
        isCustomNameRequired: false,
        isLoadingPlaceDetails: false,
      }));
    } else {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat: clickedLat, lng: clickedLng } }, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          setState(prev => ({
            ...prev,
            newPlaceDetails: {
              name: '',
              address: results[0].formatted_address || '',
              place_id: '',
            },
            isCustomNameRequired: true,
            isLoadingPlaceDetails: false,
          }));
        }
      });
    }
  };

  const saveNewPlace = async () => {
    if (
      !state.newPin ||
      !state.newPlaceDetails ||
      !state.newPlaceCategory ||
      !userState.isAuthenticated ||
      (state.isCustomNameRequired && !state.customPlaceName)
    )
      return;

    try {
      const newPlace = {
        name: state.isCustomNameRequired ? state.customPlaceName : state.newPlaceDetails.name,
        description: '',
        address: state.newPlaceDetails.address,
        location: {
          latitude: state.newPin.lat,
          longitude: state.newPin.lng,
        },
        place_id: state.newPlaceDetails.place_id,
        category: state.newPlaceCategory,
        ageGroups: state.newPlaceAgeGroups,
        priceRange: state.newPlacePriceRange,
        amenities: state.newPlaceAmenities,
        verifications: 0,
        verifiedBy: [],
        createdBy: userState.email || 'anonymous',
        createdAt: new Date(),
        updatedAt: new Date(),
        activityType: state.newPlaceActivityType,
      };

      const docRef = await addDoc(collection(db, 'places'), newPlace);
      const placeWithId = { ...newPlace, id: docRef.id };

      if (onPlaceAdded) {
        onPlaceAdded(placeWithId as Place);
      }

      setState(prev => ({
        ...prev,
        newPin: null,
        newPlaceDetails: null,
        newPlaceCategory: '',
        newPlaceAgeGroups: ['0-1', '1-3', '3-5', '5+'],
        newPlacePriceRange: '$',
        newPlaceActivityType: 'outdoor',
        newPlaceAmenities: {
          changingTables: false,
          playAreas: false,
          highChairs: false,
          accessibility: false,
          kidsMenu: false,
        },
        isAddingPlace: false,
        categoryDetected: false,
        isCustomNameRequired: false,
        customPlaceName: '',
      }));

      NotificationService.success('Local adicionado com sucesso!');

      if (state.isNearbyMode && state.userLocation) {
        const nearby = calculateNearbyPlaces(state.userLocation, [...places, placeWithId]);
        setState(prev => ({ ...prev, nearbyPlaces: nearby }));
      }
    } catch (error) {
      logError(error, 'map_permission_save_error');
      NotificationService.error(
        'Erro ao adicionar local:',
        error instanceof Error ? { message: error.message } : String(error)
      );
      NotificationService.error('Erro ao adicionar local. Tente novamente.');
    }
  };

  const getMarkerIcon = (category: string, animate = false) => {
    const color =
      CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.default;
    const iconPath =
      CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || CATEGORY_ICONS.default;

    // Example of using the animate parameter
    const scale = animate ? 1.8 : 1.5;

    return {
      path: iconPath,
      fillColor: color,
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: '#FFFFFF',
      scale,
      anchor: new google.maps.Point(12, 12),
    };
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
        zoom={state.userLocation ? 15 : 8}
        center={state.userLocation || center}
        onClick={handleMapClick}
        onLoad={handleMapLoad}
        options={{
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'on' }],
            },
          ],
          gestureHandling: 'greedy',
          fullscreenControl: true,
          zoomControl: true,
          streetViewControl: true,
          mapTypeControl: true,
        }}
      >
        <MapStatusIndicator
          isLoading={state.isLoadingMapData}
          placesCount={state.visiblePlaces.length}
          isPanning={state.isPanning}
          showNeedsSearch={
            !state.isNearbyMode && state.visiblePlaces.length === 0 && !state.isLoadingMapData
          }
        />
        {state.visiblePlaces.map(place => (
          <Marker
            key={place.id}
            position={{ lat: place.location.latitude, lng: place.location.longitude }}
            onClick={() => setState(prev => ({ ...prev, selectedPlace: place }))}
            icon={getMarkerIcon(place.category)}
            animation={google.maps.Animation.DROP} // Animação de queda para os marcadores
          />
        ))}
        {state.userLocation && (
          <>
            <Marker
              position={state.userLocation}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 2,
              }}
              zIndex={1000}
            />
            <Circle
              center={state.userLocation}
              radius={50}
              options={{
                strokeColor: '#4285F4',
                strokeOpacity: 0.8,
                strokeWeight: 1,
                fillColor: '#4285F4',
                fillOpacity: 0.15,
              }}
            />
          </>
        )}

        {state.newPin && (
          <Marker
            position={state.newPin}
            animation={google.maps.Animation.DROP}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 40),
            }}
            zIndex={1000}
          />
        )}

        {state.selectedPlace && (
          <InfoWindow
            position={{
              lat: state.selectedPlace.location.latitude,
              lng: state.selectedPlace.location.longitude,
            }}
            onCloseClick={() => setState(prev => ({ ...prev, selectedPlace: null }))}
          >
            <div className="p-2">
              <h3 className="font-bold text-lg">{state.selectedPlace.name}</h3>
              <p className="text-sm text-gray-600">{state.selectedPlace.category}</p>
              <p className="mt-1">{state.selectedPlace.description}</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Indicador para encorajar a exploração do mapa */}
      {!state.isLoadingMapData && state.visiblePlaces.length < 3 && state.currentMapBounds && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10 bg-white bg-opacity-90 px-4 py-2 rounded-full shadow-md">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-500 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <span className="text-gray-700 text-sm">Mova o mapa para explorar mais lugares</span>
          </div>
        </div>
      )}

      {/* Indicador de área vazia */}
      {!state.isLoadingMapData && state.visiblePlaces.length === 0 && !state.isNearbyMode && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 bg-yellow-50 bg-opacity-90 px-4 py-2 rounded-full shadow-md">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-yellow-500 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="text-yellow-700 text-sm">Nenhum lugar encontrado nesta área</span>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-md z-10 max-w-md overflow-y-auto max-h-[90vh]">
        {!state.isAddingPlace ? (
          <MapControls
            isAddingPlace={state.isAddingPlace}
            isLocationLoading={state.isLocationLoading}
            userState={userState}
            onAddPlaceClick={() => setState(prev => ({ ...prev, isAddingPlace: true }))}
            onNearMeClick={() => handleNearMeClick(false, true)}
          />
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
                    onClick={() => setState(prev => ({ ...prev, isAddingPlace: false }))}
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
            <AddPlaceForm
              newPlaceDetails={state.newPlaceDetails}
              newPlaceCategory={state.newPlaceCategory}
              newPlacePriceRange={state.newPlacePriceRange}
              newPlaceActivityType={state.newPlaceActivityType}
              newPlaceAgeGroups={state.newPlaceAgeGroups}
              newPlaceAmenities={state.newPlaceAmenities}
              isCustomNameRequired={state.isCustomNameRequired}
              customPlaceName={state.customPlaceName}
              categoryDetected={state.categoryDetected}
              isLoadingPlaceDetails={state.isLoadingPlaceDetails}
              onCategoryChange={category =>
                setState(prev => ({ ...prev, newPlaceCategory: category, categoryDetected: true }))
              }
              onPriceRangeChange={priceRange =>
                setState(prev => ({ ...prev, newPlacePriceRange: priceRange }))
              }
              onActivityTypeChange={activityType =>
                setState(prev => ({ ...prev, newPlaceActivityType: activityType }))
              }
              onAgeGroupChange={ageGroups =>
                setState(prev => ({ ...prev, newPlaceAgeGroups: ageGroups }))
              }
              onAmenitiesChange={amenities =>
                setState(prev => ({ ...prev, newPlaceAmenities: amenities }))
              }
              onCustomNameChange={name => setState(prev => ({ ...prev, customPlaceName: name }))}
              onCancel={() => {
                setState(prev => ({
                  ...prev,
                  isAddingPlace: false,
                  newPin: null,
                  newPlaceDetails: null,
                  isCustomNameRequired: false,
                  customPlaceName: '',
                }));
              }}
              onSave={saveNewPlace}
              isSaveDisabled={
                !state.newPin ||
                !state.newPlaceDetails ||
                !state.newPlaceCategory ||
                (state.isCustomNameRequired && !state.customPlaceName)
              }
            />
          </ErrorBoundary>
        )}
      </div>
      {state.currentMapBounds && !state.isNearbyMode && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10"></div>
      )}
    </div>
  );
};

export default Map;
