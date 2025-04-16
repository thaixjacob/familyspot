import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
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
  maxDistance = 10000
): Place[] => {
  if (!google.maps.geometry || !google.maps.geometry.spherical) {
    logError(new Error('Google Maps geometry library not available'), 'map_geometry_error');
    return [];
  }

  if (!places || places.length === 0) {
    return [];
  }

  return places.filter(place => {
    if (!place.location || !place.location.latitude || !place.location.longitude) {
      return false;
    }

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

export const fetchPlacesInBounds = async (
  mapBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null
): Promise<Place[]> => {
  if (!mapBounds) {
    return [];
  }

  try {
    const placesRef = collection(db, 'places');
    const placesSnapshot = await getDocs(placesRef);

    const filteredPlaces = placesSnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Place;
      })
      .filter(place => {
        const lat = place.location.latitude;
        const lng = place.location.longitude;

        return (
          lat <= mapBounds.north &&
          lat >= mapBounds.south &&
          lng <= mapBounds.east &&
          lng >= mapBounds.west
        );
      });

    return filteredPlaces;
  } catch (error) {
    logError(error, 'fetch_places_in_bounds_error');
    return [];
  }
};

// Função para calcular se a mudança nos limites é significativa
export const isBoundsChangeSignificant = (
  oldBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null,
  newBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null,
  threshold = 0.3 // 30% de sobreposição como padrão
): boolean => {
  if (!oldBounds || !newBounds) {
    return true; // Se não tivermos limites anteriores, consideramos significativo
  }

  // Calcular área de sobreposição
  const overlapNorth = Math.min(oldBounds.north, newBounds.north);
  const overlapSouth = Math.max(oldBounds.south, newBounds.south);
  const overlapEast = Math.min(oldBounds.east, newBounds.east);
  const overlapWest = Math.max(oldBounds.west, newBounds.west);

  // Verificar se há sobreposição
  if (overlapNorth <= overlapSouth || overlapEast <= overlapWest) {
    return true; // Não há sobreposição, então é significativo
  }

  // Calcular áreas
  const areaOld = (oldBounds.north - oldBounds.south) * (oldBounds.east - oldBounds.west);
  const areaNew = (newBounds.north - newBounds.south) * (newBounds.east - newBounds.west);
  const areaOverlap = (overlapNorth - overlapSouth) * (overlapEast - overlapWest);

  // Calcular porcentagem de sobreposição
  const overlapRatioOld = areaOverlap / areaOld;
  const overlapRatioNew = areaOverlap / areaNew;

  // Retorna true se a sobreposição for menor que o threshold
  return overlapRatioOld < threshold || overlapRatioNew < threshold;
};

// Função para calcular a distância entre o centro de dois limites
export const calculateBoundsCenterDistance = (
  bounds1: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null,
  bounds2: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null
): number => {
  if (!bounds1 || !bounds2) {
    return Infinity;
  }

  // Calcular centro do primeiro bounds
  const center1 = {
    lat: (bounds1.north + bounds1.south) / 2,
    lng: (bounds1.east + bounds1.west) / 2,
  };

  // Calcular centro do segundo bounds
  const center2 = {
    lat: (bounds2.north + bounds2.south) / 2,
    lng: (bounds2.east + bounds2.west) / 2,
  };

  // Calcular distância usando a fórmula de Haversine (para distâncias em coordenadas geográficas)
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = (center1.lat * Math.PI) / 180;
  const φ2 = (center2.lat * Math.PI) / 180;
  const Δφ = ((center2.lat - center1.lat) * Math.PI) / 180;
  const Δλ = ((center2.lng - center1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // em metros

  return distance;
};
