import { Place } from '../../types/Place';

export interface MapProps {
  places: Place[];
  onPlaceAdded: (newPlace: Place) => void;
  onMapLoad?: (map: google.maps.Map) => void;
  onNearbyPlacesUpdate?: (nearby: Place[]) => void;
}

export interface NewPlaceDetails {
  name: string;
  address: string;
  place_id: string;
}

export interface PlaceAmenities {
  changingTables: boolean;
  playAreas: boolean;
  highChairs: boolean;
  accessibility: boolean;
  kidsMenu: boolean;
}

export interface MapState {
  selectedPlace: Place | null;
  newPin: { lat: number; lng: number } | null;
  newPlaceDetails: {
    name: string;
    address: string;
    place_id: string;
  } | null;
  newPlaceCategory: string;
  newPlaceAgeGroups: string[];
  newPlacePriceRange: string;
  newPlaceActivityType: string;
  newPlaceAmenities: {
    changingTables: boolean;
    playAreas: boolean;
    highChairs: boolean;
    accessibility: boolean;
    kidsMenu: boolean;
  };
  isAddingPlace: boolean;
  isLoadingPlaceDetails: boolean;
  categoryDetected: boolean;
  isCustomNameRequired: boolean;
  customPlaceName: string;
  userLocation: { lat: number; lng: number } | null;
  allPlaces: Place[];
  nearbyPlaces: Place[];
  isNearbyMode: boolean;
  hasLocationPermission: boolean | null;
  isLocationLoading: boolean;
  currentMapBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null;
  needsPlaceUpdate: boolean;
  visiblePlaces: Place[];
  isLoadingMapData: boolean;
  lastQueriedBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null;
  minPanDistanceThreshold: number; // Distância mínima em metros para considerar uma mudança significativa
  overlapThreshold: number; // Porcentagem de sobreposição para considerar uma mudança significativa
  isPanning: boolean;
}
