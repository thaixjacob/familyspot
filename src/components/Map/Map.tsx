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
  PlacesCache,
  createCache,
  updateCache,
  getPlacesFromCache,
  clearExpiredCache,
} from './utils';
import MapControls from './MapControls';
import AddPlaceForm from './AddPlaceForm';
import { CATEGORY_COLORS, CATEGORY_ICONS } from './constants';
import MapStatusIndicator from './MapStatusIndicator';
import MapErrorBoundary from './ErrorHandling/MapErrorBoundary';
import MapErrorHandler, { handleMapError } from './ErrorHandling/MapErrorHandler';
import NetworkStatusMonitor from './ErrorHandling/NetworkStatusMonitor';
import MapLoadingError from './ErrorHandling/MapLoadingError';

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
    newPlaceAgeGroups: [],
    newPlacePriceRange: '',
    newPlaceActivityType: '',
    newPlaceAmenities: {
      accessibility: false,
      changingTables: false,
      parking: false,
      publicTransport: false,
      drinkingWater: false,
      foodNearby: false,
      publicRestrooms: false,
      petFriendly: false,
      picnicArea: false,
      shadedAreas: false,
      tablesAndBenches: false,
      nightLighting: false,
      specialNeeds: false,
      waitingArea: false,
      supervisedActivities: false,
      accessibleTrails: false,
      fencedArea: false,
      playAreas: false,
      highChairs: false,
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
    isFirstLoad: true,
  });
  const [isGoogleMapsReady, setIsGoogleMapsReady] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const { state: userState } = useUser();
  const lastClickTime = useRef<number>(0);
  const COOLDOWN_DURATION = 30000;
  const locationCheckIdRef = useRef<string | null>(null);
  const boundsChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapListenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const placesCache = useRef<PlacesCache>(createCache());
  const cacheEnabled = useRef<boolean>(true);

  const lastQueriedBoundsRef = useRef<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);

  // Referência para armazenar os filtros atuais
  const currentFiltersRef = useRef(activeFilters);

  const prevPlacesRef = useRef(places);
  const prevVisiblePlacesRef = useRef(state.visiblePlaces);

  useEffect(() => {
    if (!process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
      NotificationService.error('Google Maps API key is missing!');
      return;
    }
  }, []);

  useEffect(() => {
    // Atualiza os lugares visíveis no mapa apenas se houver mudança real
    if (JSON.stringify(places) !== JSON.stringify(prevPlacesRef.current)) {
      setState(prevState => ({
        ...prevState,
        allPlaces: places,
        nearbyPlaces: places,
      }));
      prevPlacesRef.current = places;
    }
  }, [places]);

  useEffect(() => {
    // Tentar carregar cache salvo
    const savedCache = loadCacheFromStorage();
    if (savedCache) {
      placesCache.current = savedCache;
      // Limpar entradas expiradas imediatamente
      placesCache.current = clearExpiredCache(placesCache.current);
    }
  }, []);

  // Em outro useEffect para salvar periodicamente:
  useEffect(() => {
    // Capturar o valor atual do ref no início do efeito
    const isCacheEnabled = cacheEnabled.current;

    const cacheSaveInterval = setInterval(() => {
      // Usar a variável capturada em vez do ref diretamente
      if (isCacheEnabled && placesCache.current.entries.length > 0) {
        saveCache(placesCache.current);
      }
    }, 30000); // Salvar a cada 30 segundos se houver mudanças

    return () => {
      clearInterval(cacheSaveInterval);
      // Usar a variável capturada aqui também
      if (isCacheEnabled && placesCache.current.entries.length > 0) {
        saveCache(placesCache.current);
      }
    };
  }, []);

  const proceedWithGeolocation = useCallback(() => {
    if (!isGoogleMapsReady) {
      handleMapError(new Error('Google Maps API not ready'), 'map_load_error', {
        context: 'geolocation_lookup',
      });
      return;
    }

    setState(prev => ({ ...prev, isLocationLoading: true, isNearbyMode: true }));

    // Definir um timeout de fallback para casos em que a geolocalização trava
    const timeoutId = setTimeout(() => {
      if (state.isLocationLoading) {
        handleMapError(new Error('Geolocation request timed out'), 'location_unavailable', {
          context: 'extended_timeout',
        });
        setState(prev => ({ ...prev, isLocationLoading: false }));
      }
    }, 12000); // 12 segundos de timeout de segurança

    navigator.geolocation.getCurrentPosition(
      position => {
        // Limpar o timeout de segurança
        clearTimeout(timeoutId);

        // Extrair e validar as coordenadas
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        // Validação básica de coordenadas
        if (
          isNaN(latitude) ||
          isNaN(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          handleMapError(new Error('Invalid coordinates received'), 'location_unavailable', {
            latitude,
            longitude,
          });
          setState(prev => ({ ...prev, isLocationLoading: false, isNearbyMode: false }));
          return;
        }

        const userPos = { lat: latitude, lng: longitude };

        try {
          setState(prev => ({ ...prev, userLocation: userPos }));

          // Calcular lugares próximos com tratamento de erro
          let nearby: Place[] = [];
          try {
            nearby = calculateNearbyPlaces(userPos, places);
          } catch (calculationError) {
            // Registrar erro, mas continuar o fluxo
            logError(calculationError, 'nearby_places_calculation_error');
            nearby = []; // Falha graciosamente com lista vazia
          }

          setState(prev => ({
            ...prev,
            nearbyPlaces: nearby,
            isLocationLoading: false,
          }));

          if (onNearbyPlacesUpdate) {
            onNearbyPlacesUpdate(nearby);
          }

          // Feedback para o usuário apenas no primeiro carregamento
          if (userState.isAuthenticated && state.isFirstLoad) {
            if (nearby.length === 0) {
              NotificationService.info(
                'Não encontramos lugares próximos a você em um raio de 10km. Você pode tentar aumentar o zoom do mapa para ver mais lugares ou adicionar um novo lugar para ajudar outras famílias!',
                { radius: '10km', location: `${latitude.toFixed(2)},${longitude.toFixed(2)}` }
              );
            } else {
              NotificationService.success(
                `Ótimo! Encontramos ${nearby.length} lugares próximos a você em um raio de 10km!`,
                { count: nearby.length }
              );
            }
            setState(prev => ({ ...prev, isFirstLoad: false }));
          }
        } catch (error) {
          clearTimeout(timeoutId);
          handleMapError(error, 'places_fetch_error', {
            context: 'nearby_processing',
            coordinates: `${latitude.toFixed(4)},${longitude.toFixed(4)}`,
          });
          setState(prev => ({ ...prev, isNearbyMode: false, isLocationLoading: false }));
        }
      },
      error => {
        // Limpar o timeout de segurança
        clearTimeout(timeoutId);

        // Tratar erros específicos de geolocalização
        switch (error.code) {
          case error.PERMISSION_DENIED:
            handleMapError(error, 'location_permission_denied', { errorCode: error.code });
            break;
          case error.POSITION_UNAVAILABLE:
            handleMapError(error, 'location_unavailable', {
              errorCode: error.code,
              message: error.message,
            });
            break;
          case error.TIMEOUT:
            handleMapError(error, 'location_unavailable', {
              errorCode: error.code,
              context: 'timeout',
            });
            break;
          default:
            handleMapError(error, 'location_unavailable', { errorCode: error.code });
        }

        setState(prev => ({ ...prev, isNearbyMode: false, isLocationLoading: false }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // Aumentado para 10 segundos para maior tolerância
        maximumAge: 0,
      }
    );

    return () => clearTimeout(timeoutId); // Limpar o timeout se o componente desmontar
  }, [
    places,
    userState.isAuthenticated,
    onNearbyPlacesUpdate,
    isGoogleMapsReady,
    state.isLocationLoading,
    state.isFirstLoad,
  ]);

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
      // Verificar se o Google Maps está pronto
      if (!isGoogleMapsReady) {
        handleMapError(new Error('Google Maps not ready'), 'map_load_error', {
          context: 'near_me_click',
        });
        return;
      }

      // Verificar o tempo entre cliques (throttling)
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

      // Verificar se o navegador suporta geolocalização
      if (!navigator.geolocation) {
        handleMapError(new Error('Geolocation not supported'), 'location_unavailable', {
          browserName: navigator.userAgent,
        });
        return;
      }

      // Se já possui permissão, prosseguir
      if (hasPermission) {
        proceedWithGeolocation();
        return;
      }

      // Verificar permissão do navegador
      if (state.hasLocationPermission === null) {
        try {
          const browserHasPermission = await checkBrowserPermission();
          if (browserHasPermission) {
            proceedWithGeolocation();
            return;
          }
        } catch (error) {
          handleMapError(error, 'location_unavailable', { context: 'permission_check' });
          return;
        }
      }

      // Solicitar permissão de localização
      navigator.geolocation.getCurrentPosition(
        () => {
          // Sucesso - permissão concedida
          setState(prev => ({ ...prev, hasLocationPermission: true }));
          proceedWithGeolocation();
        },
        error => {
          // Erro ao obter localização
          setState(prev => ({ ...prev, hasLocationPermission: false }));

          // Determinar o tipo específico de erro de geolocalização
          switch (error.code) {
            case error.PERMISSION_DENIED:
              handleMapError(error, 'location_permission_denied', { errorCode: error.code });
              break;
            case error.POSITION_UNAVAILABLE:
              handleMapError(error, 'location_unavailable', {
                errorCode: error.code,
                message: error.message,
              });
              break;
            case error.TIMEOUT:
              handleMapError(error, 'location_unavailable', {
                errorCode: error.code,
                context: 'timeout',
              });
              break;
            default:
              handleMapError(error, 'location_unavailable', { errorCode: error.code });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0,
        }
      );
    },
    [
      proceedWithGeolocation,
      state.hasLocationPermission,
      checkBrowserPermission,
      userState.isAuthenticated,
      isGoogleMapsReady,
    ]
  );

  useEffect(() => {
    if (!isGoogleMapsReady) return;
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
  }, [userState.isAuthenticated, handleNearMeClick, isGoogleMapsReady]);

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
        // Evita múltiplas chamadas simultâneas
        if (state.isLoadingMapData) return;

        setState(prev => ({ ...prev, isLoadingMapData: true }));

        try {
          // Verificar se existe no cache primeiro
          let placesInBounds: Place[] = [];
          let fromCache = false;

          if (cacheEnabled.current) {
            // Limpar entradas expiradas antes de verificar o cache
            placesCache.current = clearExpiredCache(placesCache.current);

            // Adicionar uma verificação explícita de nulidade aqui
            if (state.currentMapBounds) {
              // Tentar buscar do cache
              const cachedPlaces = getPlacesFromCache(placesCache.current, state.currentMapBounds);

              if (cachedPlaces) {
                placesInBounds = cachedPlaces;
                fromCache = true;
              }
            }
          }

          // Se não encontrou no cache, buscar do Firestore
          if (!fromCache && state.currentMapBounds) {
            // Adicionamos state.currentMapBounds aqui
            placesInBounds = await fetchPlacesInBounds(state.currentMapBounds);

            // Atualizar o cache com os novos dados
            if (cacheEnabled.current) {
              placesCache.current = updateCache(
                placesCache.current,
                placesInBounds,
                state.currentMapBounds
              );
            }
          }

          // Aplicar filtros
          const filteredPlaces = applyFiltersToPlaces(placesInBounds);

          // Atualizar lastQueriedBoundsRef
          if (state.currentMapBounds) {
            lastQueriedBoundsRef.current = { ...state.currentMapBounds };
          }

          // Atualiza o estado apenas se houver mudanças reais
          if (JSON.stringify(filteredPlaces) !== JSON.stringify(prevVisiblePlacesRef.current)) {
            setState(prev => ({
              ...prev,
              visiblePlaces: filteredPlaces,
              needsPlaceUpdate: false,
              isLoadingMapData: false,
            }));
            prevVisiblePlacesRef.current = filteredPlaces;
          } else {
            setState(prev => ({
              ...prev,
              needsPlaceUpdate: false,
              isLoadingMapData: false,
            }));
          }

          // Notificar o pai, se necessário
          if (onNearbyPlacesUpdate) {
            onNearbyPlacesUpdate(filteredPlaces);
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
    state.isLoadingMapData,
  ]);

  useEffect(() => {
    const cacheCleanupInterval = setInterval(() => {
      try {
        if (cacheEnabled.current) {
          placesCache.current = clearExpiredCache(placesCache.current);
        }
      } catch (error) {
        logError(error, 'cache_cleanup_error');
      }
    }, 60000);

    return () => {
      clearInterval(cacheCleanupInterval);
    };
  }, []);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY as string,
    libraries: libraries as ('places' | 'drawing' | 'geometry' | 'visualization')[],
  });

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      placesServiceRef.current = new google.maps.places.PlacesService(map);

      setIsGoogleMapsReady(true);

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

  const invalidateCache = useCallback(() => {
    placesCache.current = createCache(
      placesCache.current.maxEntries,
      placesCache.current.expirationTime
    );
  }, []);

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

      // Invalidar o cache após adicionar um novo lugar
      invalidateCache();

      setState(prev => ({
        ...prev,
        newPin: null,
        newPlaceDetails: null,
        newPlaceCategory: '',
        newPlaceAgeGroups: [],
        newPlacePriceRange: '',
        newPlaceActivityType: '',
        newPlaceAmenities: {
          accessibility: false,
          changingTables: false,
          parking: false,
          publicTransport: false,
          drinkingWater: false,
          foodNearby: false,
          publicRestrooms: false,
          petFriendly: false,
          picnicArea: false,
          shadedAreas: false,
          tablesAndBenches: false,
          nightLighting: false,
          specialNeeds: false,
          waitingArea: false,
          supervisedActivities: false,
          accessibleTrails: false,
          fencedArea: false,
          playAreas: false,
          highChairs: false,
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

  const saveCache = (cache: PlacesCache) => {
    try {
      localStorage.setItem('familyspot_places_cache', JSON.stringify(cache));
    } catch (error) {
      logError(error, 'cache_save_warning');

      // Modo de desenvolvimento podemos mostrar mais detalhes
      if (process.env.NODE_ENV === 'development') {
        logError(error, 'cache_save_warning');
      }
    }
  };

  const loadCacheFromStorage = (): PlacesCache | null => {
    try {
      const stored = localStorage.getItem('familyspot_places_cache');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      logError(error, 'cache_load_warning');

      if (process.env.NODE_ENV === 'development') {
        logError(error, 'cache_load_warning');
      }
    }
    return null;
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

  // Função para reiniciar o componente do mapa
  const handleReset = useCallback(() => {
    setResetKey(prev => prev + 1);
    invalidateCache();
    setState(prev => ({
      ...prev,
      needsPlaceUpdate: true,
      isLoadingMapData: false,
      isPanning: false,
    }));
  }, [invalidateCache]);

  const handleNetworkStatusChange = useCallback((isOnline: boolean) => {
    if (isOnline) {
      // Quando a conexão é restabelecida, atualizar os dados
      setState(prev => ({
        ...prev,
        needsPlaceUpdate: true,
        isLoadingMapData: false,
      }));
    }
  }, []);

  // Gerenciar o erro de carregamento do mapa
  if (loadError) {
    return (
      <MapLoadingError error={loadError.toString()} onRetry={() => window.location.reload()} />
    );
  }

  // Exibir carregador enquanto o mapa está sendo carregado
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-600 text-center">
          <LoadingSpinner size="lg" color="text-gray-600" />
          <p className="text-lg font-medium mt-4">Carregando mapa...</p>
          <p className="text-sm text-gray-500 mt-2">Isso pode levar alguns segundos...</p>
        </div>
      </div>
    );
  }

  return (
    <NetworkStatusMonitor onStatusChange={handleNetworkStatusChange}>
      <MapErrorBoundary
        onReset={handleReset}
        fallback={
          <div className="h-screen w-full flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
              <div className="flex items-center justify-center mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-center mb-4">Erro no mapa</h2>
              <p className="text-gray-600 mb-6 text-center">
                Ocorreu um erro ao carregar o mapa. Por favor, tente novamente.
              </p>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={handleReset}
                  className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Tentar novamente
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Recarregar página
                </button>
              </div>
            </div>
          </div>
        }
      >
        <MapErrorHandler onReload={handleReset}>
          <div className="h-screen w-full relative" key={`map-container-${resetKey}`}>
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
            {!state.isLoadingMapData &&
              state.visiblePlaces.length < 3 &&
              state.currentMapBounds && (
                <div className="absolute top-[60px] left-1/2 transform -translate-x-1/2 z-10 bg-blue-50 bg-opacity-90 px-4 py-2 rounded-full shadow-md">
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-blue-500 mr-2"
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
                    <span className="text-blue-700 text-sm">
                      Explore o mapa para descobrir mais lugares
                    </span>
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
                  <span className="text-yellow-700 text-sm">
                    Nenhum lugar encontrado nesta área
                  </span>
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
                      setState(prev => ({
                        ...prev,
                        newPlaceCategory: category,
                        categoryDetected: true,
                      }))
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
                    onCustomNameChange={name =>
                      setState(prev => ({ ...prev, customPlaceName: name }))
                    }
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
                    isSaving={false}
                  />
                </ErrorBoundary>
              )}
            </div>
            {state.currentMapBounds && !state.isNearbyMode && (
              <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10"></div>
            )}
          </div>
        </MapErrorHandler>
      </MapErrorBoundary>
    </NetworkStatusMonitor>
  );
};

export default Map;
