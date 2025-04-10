import { Place } from '../../types/Place';

export interface MapProps {
  places: Place[];
  onPlaceAdded?: (place: Place) => void;
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
  newPin: google.maps.LatLngLiteral | null;
  newPlaceDetails: NewPlaceDetails | null;
  newPlaceCategory: string;
  newPlaceAgeGroups: string[];
  newPlacePriceRange: string;
  newPlaceActivityType: string;
  newPlaceAmenities: PlaceAmenities;
  isAddingPlace: boolean;
  isLoadingPlaceDetails: boolean;
  categoryDetected: boolean;
  isCustomNameRequired: boolean;
  customPlaceName: string;
  userLocation: google.maps.LatLngLiteral | null;
  nearbyPlaces: Place[];
  isNearbyMode: boolean;
  hasLocationPermission: boolean | null;
  isLocationLoading: boolean;
}
