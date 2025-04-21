import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Place } from '../../types/Place';
import { logError, logEvent } from '../../utils/logger';

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
  // Verificar se o objeto google existe e se a API Geometry foi carregada
  if (
    typeof google === 'undefined' ||
    !google.maps ||
    !google.maps.geometry ||
    !google.maps.geometry.spherical
  ) {
    logError(
      new Error('Google Maps API not loaded yet or geometry library missing'),
      'google_maps_api_error'
    );
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

/**
 * Busca lugares dentro de limites geográficos específicos do Firestore
 * com tratamento de erros aprimorado e informações de diagnóstico.
 */
export const fetchPlacesInBounds = async (
  mapBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null
): Promise<Place[]> => {
  // Validar parâmetros de entrada
  if (!mapBounds) {
    logError(new Error('Null map bounds provided'), 'fetch_places_null_bounds');
    return [];
  }

  // Validar limites do mapa
  if (!isValidBounds(mapBounds)) {
    logError(
      new Error(`Invalid map bounds: ${JSON.stringify(mapBounds)}`),
      'fetch_places_invalid_bounds'
    );
    return [];
  }

  const startTime = performance.now();

  try {
    // Obter referência à coleção
    const placesRef = collection(db, 'places');

    // Adicionar timeout para evitar operações que ficam presas
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Timeout fetching places from Firestore'));
      }, 15000); // 15 segundos de timeout
    });

    // Race entre a busca real e o timeout
    const placesSnapshot = (await Promise.race([getDocs(placesRef), timeoutPromise])) as any;

    // Filtrar lugares baseado nos limites do mapa
    const filteredPlaces = placesSnapshot.docs
      .map((doc: import('firebase/firestore').QueryDocumentSnapshot) => {
        try {
          const data = doc.data();

          // Verificar se os dados necessários existem
          if (
            !data.location ||
            typeof data.location.latitude !== 'number' ||
            typeof data.location.longitude !== 'number'
          ) {
            logError(
              new Error(`Invalid location data for place ${doc.id}`),
              'fetch_places_invalid_location'
            );
            return null;
          }

          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Place;
        } catch (docError) {
          logError(docError, `fetch_places_doc_error_${doc.id}`);
          return null;
        }
      })
      .filter((place: Place | null): place is Place => {
        // Filtrar places nulos (que tiveram erro no processamento)
        if (!place) return false;

        try {
          const lat = place.location.latitude;
          const lng = place.location.longitude;

          return (
            lat <= mapBounds.north &&
            lat >= mapBounds.south &&
            lng <= mapBounds.east &&
            lng >= mapBounds.west
          );
        } catch (filterError) {
          logError(filterError, `fetch_places_filter_error_${place.id}`);
          return false;
        }
      });

    const endTime = performance.now();

    // Log performance metrics em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      logEvent('places_fetch_performance', {
        places_count: filteredPlaces.length,
        duration_ms: (endTime - startTime).toFixed(2),
      });
    }

    return filteredPlaces;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Log detalhado do erro para diagnóstico
    logError(error, 'fetch_places_in_bounds_error');

    // Log adicional com contexto
    logError(error, 'fetch_places_details');

    // Log detalhes do erro
    logEvent('places_fetch_error_details', {
      bounds: mapBounds,
      duration_ms: duration.toFixed(2),
      error_type: error instanceof Error ? error.name : 'unknown',
    });

    // Em modo de desenvolvimento, fornecer mais detalhes
    if (process.env.NODE_ENV === 'development') {
      logEvent('places_fetch_debug_info', {
        map_bounds: mapBounds,
        operation_duration_ms: duration.toFixed(2),
      });
    }

    return [];
  }
};

/**
 * Valida se os limites do mapa são valores numéricos válidos
 */
function isValidBounds(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}): boolean {
  return (
    !isNaN(bounds.north) &&
    !isNaN(bounds.south) &&
    !isNaN(bounds.east) &&
    !isNaN(bounds.west) &&
    bounds.north >= bounds.south &&
    bounds.east >= bounds.west &&
    bounds.north >= -90 &&
    bounds.north <= 90 &&
    bounds.south >= -90 &&
    bounds.south <= 90 &&
    bounds.east >= -180 &&
    bounds.east <= 180 &&
    bounds.west >= -180 &&
    bounds.west <= 180
  );
}

/**
 * Função para calcular se a mudança nos limites é significativa
 * @param oldBounds Limites anteriores
 * @param newBounds Novos limites
 * @param threshold Percentual de sobreposição considerado não significativo
 * @returns Verdadeiro se a mudança for significativa
 */
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

/**
 * Função para calcular a distância entre o centro de dois limites
 */
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

/**
 * Interface para entrada do cache
 */
export interface CacheEntry {
  places: Place[];
  timestamp: number; // Timestamp para expiração de cache
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

/**
 * Interface para o sistema de cache de lugares
 */
export interface PlacesCache {
  entries: CacheEntry[];
  maxEntries: number; // Limite máximo de entradas no cache
  expirationTime: number; // Tempo em ms após o qual o cache expira
}

/**
 * Criar cache inicial vazio
 * @param maxEntries Número máximo de entradas no cache
 * @param expirationTime Tempo de expiração em milissegundos
 * @returns Cache vazio inicializado
 */
export const createCache = (maxEntries = 20, expirationTime = 15 * 60 * 1000): PlacesCache => ({
  entries: [],
  maxEntries,
  expirationTime, // 15 minutos padrão
});

/**
 * Verifica se dois limites geográficos têm sobreposição significativa
 */
export const haveBoundsSignificantOverlap = (
  bounds1: { north: number; south: number; east: number; west: number } | null,
  bounds2: { north: number; south: number; east: number; west: number } | null,
  overlapThreshold = 0.7 // 70% de sobreposição
): boolean => {
  if (!bounds1 || !bounds2) return false;

  // Calcular área de sobreposição
  const overlapNorth = Math.min(bounds1.north, bounds2.north);
  const overlapSouth = Math.max(bounds1.south, bounds2.south);
  const overlapEast = Math.min(bounds1.east, bounds2.east);
  const overlapWest = Math.max(bounds1.west, bounds2.west);

  // Verificar se há sobreposição
  if (overlapNorth <= overlapSouth || overlapEast <= overlapWest) {
    return false; // Não há sobreposição
  }

  // Calcular áreas
  const areaOverlap = (overlapNorth - overlapSouth) * (overlapEast - overlapWest);
  const area1 = (bounds1.north - bounds1.south) * (bounds1.east - bounds1.west);
  const area2 = (bounds2.north - bounds2.south) * (bounds2.east - bounds2.west);

  // Calcular proporção de sobreposição em relação a cada área
  const overlapRatio1 = areaOverlap / area1;
  const overlapRatio2 = areaOverlap / area2;

  // Retorna true se a sobreposição for maior que o threshold para ambas as áreas
  return overlapRatio1 >= overlapThreshold && overlapRatio2 >= overlapThreshold;
};

/**
 * Adicionar ou atualizar lugares no cache
 * @param cache Cache atual
 * @param places Lugares para adicionar
 * @param bounds Limites geográficos dos lugares
 * @returns Cache atualizado
 */
export const updateCache = (
  cache: PlacesCache,
  places: Place[],
  bounds: { north: number; south: number; east: number; west: number }
): PlacesCache => {
  const now = Date.now();
  const updatedEntries = [...cache.entries];

  // Verificar se já existe uma entrada com sobreposição significativa
  const existingEntryIndex = updatedEntries.findIndex(entry =>
    haveBoundsSignificantOverlap(entry.bounds, bounds)
  );

  if (existingEntryIndex >= 0) {
    // Atualizar entrada existente
    updatedEntries[existingEntryIndex] = {
      places,
      timestamp: now,
      bounds,
    };
  } else {
    // Adicionar nova entrada
    updatedEntries.push({
      places,
      timestamp: now,
      bounds,
    });

    // Remover entradas mais antigas se exceder o limite
    if (updatedEntries.length > cache.maxEntries) {
      updatedEntries.sort((a, b) => b.timestamp - a.timestamp); // Mais recentes primeiro
      updatedEntries.length = cache.maxEntries;
    }
  }

  return {
    ...cache,
    entries: updatedEntries,
  };
};

/**
 * Buscar lugares do cache
 * @param cache Cache atual
 * @param bounds Limites geográficos para busca
 * @returns Array de lugares encontrados ou null se não encontrar
 */
export const getPlacesFromCache = (
  cache: PlacesCache,
  bounds: { north: number; south: number; east: number; west: number }
): Place[] | null => {
  const now = Date.now();

  // Encontrar entrada de cache com sobreposição significativa e não expirada
  const entry = cache.entries.find(
    entry =>
      haveBoundsSignificantOverlap(entry.bounds, bounds) &&
      now - entry.timestamp < cache.expirationTime
  );

  return entry ? entry.places : null;
};

/**
 * Limpar entradas expiradas do cache
 * @param cache Cache a ser limpo
 * @returns Cache com entradas expiradas removidas
 */
export const clearExpiredCache = (cache: PlacesCache): PlacesCache => {
  const now = Date.now();
  const validEntries = cache.entries.filter(entry => now - entry.timestamp < cache.expirationTime);

  return {
    ...cache,
    entries: validEntries,
  };
};
