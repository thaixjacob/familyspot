/**
 * Serviço de Verificação de Locais
 *
 * Este serviço gerencia o sistema de verificação de locais, permitindo que usuários
 * verifiquem a autenticidade e qualidade dos locais cadastrados.
 *
 * Funcionalidades:
 * - Verificação de locais por usuários
 * - Contagem de verificações
 * - Consulta de verificações por local
 * - Consulta de verificações por usuário
 * - Adição de novas verificações
 * - Atualização de status de verificação
 *
 * @example
 * await verifyPlace('placeId', 'userId');
 * const count = await getVerificationCount('placeId');
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  increment,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Verification } from '@/types';

// Verify a place
export const verifyPlace = async (placeId: string, userId: string) => {
  // Check if user has already verified this place
  const placeRef = doc(db, 'places', placeId);
  const placeSnap = await getDoc(placeRef);

  if (!placeSnap.exists()) {
    throw new Error('Place not found');
  }

  const placeData = placeSnap.data();

  // If user has already verified, don't allow duplicate verification
  if (placeData.verifiedBy && placeData.verifiedBy.includes(userId)) {
    throw new Error('You have already verified this place');
  }

  // Update verification count and add user to verifiedBy array
  return await updateDoc(placeRef, {
    verifications: increment(1),
    verifiedBy: arrayUnion(userId),
  });
};

// Get verification count for a place
export const getVerificationCount = async (placeId: string) => {
  const placeRef = doc(db, 'places', placeId);
  const placeSnap = await getDoc(placeRef);

  if (!placeSnap.exists()) {
    throw new Error('Place not found');
  }

  return placeSnap.data().verifications || 0;
};

export const VerificationService = {
  async getVerificationsByPlaceId(placeId: string): Promise<Verification[]> {
    const verificationsRef = collection(db, 'verifications');
    const q = query(verificationsRef, where('placeId', '==', placeId));
    const verificationsSnapshot = await getDocs(q);
    return verificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Verification[];
  },

  async getVerificationsByUserId(userId: string): Promise<Verification[]> {
    const verificationsRef = collection(db, 'verifications');
    const q = query(verificationsRef, where('userId', '==', userId));
    const verificationsSnapshot = await getDocs(q);
    return verificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Verification[];
  },

  async addVerification(verification: Omit<Verification, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'verifications'), verification);
    return docRef.id;
  },

  async updateVerificationStatus(
    id: string,
    status: Verification['status'],
    comment?: string
  ): Promise<void> {
    const verificationRef = doc(db, 'verifications', id);
    const verificationDoc = await getDoc(verificationRef);
    if (!verificationDoc.exists()) throw new Error('Verification not found');

    await updateDoc(verificationRef, {
      status,
      ...(comment && { comment }),
    });
  },
};
