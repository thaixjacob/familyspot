// to handle Firestore operations
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  GeoPoint,
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Interface for Place data
interface Place {
  name: string;
  description: string;
  address: string;
  location: GeoPoint;
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
  verifications: number;
  verifiedBy: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  activityType: string;
}

// Get all places
export const getAllPlaces = async () => {
  const placesCollection = collection(db, 'places');
  const placesSnapshot = await getDocs(placesCollection);
  return placesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// Get places by category
export const getPlacesByCategory = async (category: string) => {
  const placesCollection = collection(db, 'places');
  const placesQuery = query(placesCollection, where('category', '==', category));
  const placesSnapshot = await getDocs(placesQuery);
  return placesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// Get places by age group
export const getPlacesByAgeGroup = async (ageGroup: string) => {
  const placesCollection = collection(db, 'places');
  const placesQuery = query(placesCollection, where('ageGroups', 'array-contains', ageGroup));
  const placesSnapshot = await getDocs(placesQuery);
  return placesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// Add a new place
export const addPlace = async (place: Place) => {
  const placesCollection = collection(db, 'places');
  return await addDoc(placesCollection, {
    ...place,
    createdAt: new Date(),
    updatedAt: new Date(),
    verifications: 0,
    verifiedBy: [],
  });
};

// Update an existing place
export const updatePlace = async (placeId: string, placeData: Partial<Place>) => {
  const placeRef = doc(db, 'places', placeId);
  return await updateDoc(placeRef, {
    ...placeData,
    updatedAt: new Date(),
  });
};

// Get a place by ID
export const getPlaceById = async (placeId: string) => {
  const placeRef = doc(db, 'places', placeId);
  const placeSnap = await getDoc(placeRef);

  if (placeSnap.exists()) {
    return {
      id: placeId,
      ...placeSnap.data(),
    };
  } else {
    throw new Error('Place not found');
  }
};
