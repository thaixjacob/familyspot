interface Place {
  id: string; // Document ID from Firestore
  name: string;
  description: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  }; // Converted from Firestore GeoPoint
  place_id: string; // Google Places API reference for photos
  category: string;
  ageGroups: string[]; // e.g., ['0-1', '1-3', '3-5', '5+']
  priceRange: string; // '$', '$$', '$$$', '$$$$'
  amenities: {
    changingTables: boolean;
    playAreas: boolean;
    highChairs: boolean;
    accessibility: boolean;
  };
  verifications: number;
  verifiedBy: string[]; // Array of userIds
  createdBy: string; // userId
  createdAt: Date | null;
  updatedAt: Date | null;
  activityType: string; // 'indoor', 'outdoor'
}

// For creating/updating places
interface PlaceInput {
  name: string;
  description: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  place_id: string;
  category: string;
  ageGroups: string[];
  priceRange: string;
  amenities: {
    changingTables: boolean;
    playAreas: boolean;
    highChairs: boolean;
    accessibility: boolean;
  };
  activityType: string;
}

export type { Place, PlaceInput };
