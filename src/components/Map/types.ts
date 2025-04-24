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
  // ✅ Compartilhadas entre múltiplas categorias
  accessibility: boolean;
  changingTables: boolean;
  parking: boolean;
  publicTransport: boolean;
  drinkingWater: boolean;
  foodNearby: boolean;
  publicRestrooms: boolean;
  petFriendly: boolean;
  picnicArea: boolean;
  shadedAreas: boolean;
  tablesAndBenches: boolean;
  nightLighting: boolean;

  // ✳️ Exclusivas de uma ou poucas categorias
  specialNeeds: boolean;
  waitingArea: boolean;
  supervisedActivities: boolean;
  accessibleTrails: boolean;
  fencedArea: boolean;
  playAreas: boolean;
  highChairs: boolean;
  kidsMenu: boolean;
}

export interface MapState {
  selectedPlace: Place | null;
  newPin: { lat: number; lng: number } | null;
  newPlaceDetails: NewPlaceDetails | null;
  newPlaceCategory: string;
  newPlaceAgeGroups: string[];
  newPlacePriceRange: string;
  newPlaceActivityType: string;

  // 👇 Atualizado para usar a nova interface
  newPlaceAmenities: PlaceAmenities;

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
  minPanDistanceThreshold: number;
  overlapThreshold: number;
  isPanning: boolean;
  isFirstLoad: boolean;
}
