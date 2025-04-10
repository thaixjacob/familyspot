import { Place } from '../../types/Place';
import { logError } from '../../utils/logger';

export const mapGoogleTypesToCategory = (types: string[]): string | null => {
  if (types.includes('park')) return 'parks';
  if (types.includes('restaurant')) return 'restaurants';
  if (types.includes('cafe')) return 'cafes';
  if (types.includes('playground')) return 'playgrounds';
  return null;
};

export const calculateNearbyPlaces = (
  userPos: google.maps.LatLngLiteral,
  places: Place[],
  maxDistance = 5000
): Place[] => {
  if (!google.maps.geometry || !google.maps.geometry.spherical) {
    logError(new Error('Google Maps geometry library not available'), 'map_geometry_error');
    return [];
  }

  return places.filter(place => {
    const placePos = {
      lat: place.location.latitude,
      lng: place.location.longitude,
    };
    const distance = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(userPos.lat, userPos.lng),
      new google.maps.LatLng(placePos.lat, placePos.lng)
    );
    return distance <= maxDistance;
  });
};

export const getPlaceDetails = async (
  placesService: google.maps.places.PlacesService,
  location: google.maps.LatLngLiteral
): Promise<{
  name: string;
  address: string;
  place_id: string;
  types: string[];
} | null> => {
  try {
    const request = {
      location: new google.maps.LatLng(location.lat, location.lng),
      rankBy: google.maps.places.RankBy.DISTANCE,
      type: 'establishment',
    };

    const results = await new Promise<google.maps.places.PlaceResult[]>((resolve, reject) => {
      placesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          resolve(results);
        } else {
          reject(new Error('No places found'));
        }
      });
    });

    if (results.length === 0) return null;

    const place = results[0];
    const details = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
      placesService.getDetails(
        {
          placeId: place.place_id as string,
          fields: ['name', 'formatted_address', 'place_id', 'types', 'business_status'],
        },
        (placeDetails, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && placeDetails) {
            resolve(placeDetails);
          } else {
            reject(new Error('Failed to get place details'));
          }
        }
      );
    });

    return {
      name: details.name || '',
      address: details.formatted_address || '',
      place_id: details.place_id || '',
      types: details.types || [],
    };
  } catch (error) {
    logError(error, 'map_place_details_error');
    return null;
  }
};
