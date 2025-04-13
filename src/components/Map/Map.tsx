import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
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
import { mapGoogleTypesToCategory, calculateNearbyPlaces, getPlaceDetails } from './utils';
import MapControls from './MapControls';
import AddPlaceForm from './AddPlaceForm';

interface MapProps {
  places: Place[];
  onPlaceAdded: (newPlace: Place) => void;
  onMapLoad?: (map: google.maps.Map) => void;
}

const Map = ({ places = [], onPlaceAdded, onMapLoad }: MapProps) => {
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
    nearbyPlaces: places,
    isNearbyMode: false,
    hasLocationPermission: null,
    isLocationLoading: false,
    currentMapBounds: null,
  });

  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const { state: userState } = useUser();
  const lastClickTime = useRef<number>(0);
  const COOLDOWN_DURATION = 30000;
  const locationCheckIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
      NotificationService.error('Google Maps API key is missing!');
      return;
    }
  }, []);

  useEffect(() => {
    // Garante que todos os pins estejam visíveis inicialmente
    setState(prevState => ({
      ...prevState,
      nearbyPlaces: places,
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
        setState(prev => ({ ...prev, nearbyPlaces: nearby, isLocationLoading: false }));

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
  }, [places, userState.isAuthenticated]);

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

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY as string,
    libraries: libraries as ('places' | 'drawing' | 'geometry' | 'visualization')[],
  });

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      placesServiceRef.current = new google.maps.places.PlacesService(map);

      // Ajusta o zoom e centralização para mostrar todos os pins
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

      // Adiciona listener para mudanças na região do mapa
      map.addListener('bounds_changed', () => {
        const bounds = map.getBounds();
        if (bounds) {
          const northEast = bounds.getNorthEast();
          const southWest = bounds.getSouthWest();
          if (northEast && southWest) {
            setState(prev => ({
              ...prev,
              currentMapBounds: {
                north: northEast.lat(),
                south: southWest.lat(),
                east: northEast.lng(),
                west: southWest.lng(),
              },
            }));
          }
        }
      });

      // Chama o callback onMapLoad se fornecido
      if (onMapLoad) {
        onMapLoad(map);
      }
    },
    [onMapLoad, places]
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
        {places.map(place => (
          <Marker
            key={place.id}
            position={{
              lat: place.location.latitude,
              lng: place.location.longitude,
            }}
            onClick={() => setState(prev => ({ ...prev, selectedPlace: place }))}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 40),
            }}
            animation={google.maps.Animation.DROP}
            zIndex={1000}
          />
        ))}

        {state.userLocation && (
          <Marker
            position={state.userLocation}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 40),
            }}
            zIndex={1000}
          />
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
    </div>
  );
};

export default Map;
