import {
  doc,
  updateDoc,
  arrayUnion,
  increment,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

// Verify a place
export const verifyPlace = async (placeId: string, userId: string) => {
  // Check if user has already verified this place
  const placeRef = doc(db, "places", placeId);
  const placeSnap = await getDoc(placeRef);

  if (!placeSnap.exists()) {
    throw new Error("Place not found");
  }

  const placeData = placeSnap.data();

  // If user has already verified, don't allow duplicate verification
  if (placeData.verifiedBy && placeData.verifiedBy.includes(userId)) {
    throw new Error("You have already verified this place");
  }

  // Update verification count and add user to verifiedBy array
  return await updateDoc(placeRef, {
    verifications: increment(1),
    verifiedBy: arrayUnion(userId),
  });
};

// Get verification count for a place
export const getVerificationCount = async (placeId: string) => {
  const placeRef = doc(db, "places", placeId);
  const placeSnap = await getDoc(placeRef);

  if (!placeSnap.exists()) {
    throw new Error("Place not found");
  }

  return placeSnap.data().verifications || 0;
};
