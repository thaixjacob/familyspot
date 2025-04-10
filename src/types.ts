export interface Place {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  category: string;
  ageGroups: string[];
  priceRange: string;
  activityType: string;
  amenities: {
    changingTables: boolean;
    playAreas: boolean;
    highChairs: boolean;
    accessibility: boolean;
    kidsMenu: boolean;
  };
}

export interface PlaceDetails {
  name: string;
  address: string;
  phoneNumber?: string;
  website?: string;
  rating?: number;
  userRatingsTotal?: number;
  photos?: string[];
}

export interface MapState {
  selectedPlace: Place | null;
  newPin: google.maps.LatLng | null;
  newPlaceDetails: PlaceDetails | null;
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
  userLocation: google.maps.LatLng | null;
  nearbyPlaces: Place[];
  isNearbyMode: boolean;
  hasLocationPermission: boolean | null;
  isLocationLoading: boolean;
}
