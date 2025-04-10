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
import type { Verification } from '../../types/Verification';

export class VerificationService {
  static async verifyPlace(placeId: string, userId: string): Promise<void> {
    if (!placeId || !userId) {
      throw new Error('Place ID and User ID are required');
    }

    const placeRef = doc(db, 'places', placeId);
    const placeSnap = await getDoc(placeRef);

    if (!placeSnap.exists()) {
      throw new Error('Local não encontrado');
    }

    const placeData = placeSnap.data();

    if (placeData.verifiedBy && placeData.verifiedBy.includes(userId)) {
      throw new Error('Você já verificou este local');
    }

    await updateDoc(placeRef, {
      verifications: increment(1),
      verifiedBy: arrayUnion(userId),
    });
  }

  static async getVerificationCount(placeId: string): Promise<number> {
    if (!placeId) {
      throw new Error('Place ID is required');
    }

    const placeRef = doc(db, 'places', placeId);
    const placeSnap = await getDoc(placeRef);

    if (!placeSnap.exists()) {
      throw new Error('Local não encontrado');
    }

    return placeSnap.data().verifications || 0;
  }

  static async getVerificationsByPlaceId(placeId: string): Promise<Verification[]> {
    if (!placeId) {
      throw new Error('Place ID is required');
    }

    const verificationsRef = collection(db, 'verifications');
    const q = query(verificationsRef, where('placeId', '==', placeId));
    const verificationsSnapshot = await getDocs(q);

    return verificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Verification[];
  }

  static async getVerificationsByUserId(userId: string): Promise<Verification[]> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const verificationsRef = collection(db, 'verifications');
    const q = query(verificationsRef, where('userId', '==', userId));
    const verificationsSnapshot = await getDocs(q);

    return verificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Verification[];
  }

  static async addVerification(verification: Omit<Verification, 'id'>): Promise<string> {
    if (!verification.placeId || !verification.userId) {
      throw new Error('Place ID and User ID are required');
    }

    const docRef = await addDoc(collection(db, 'verifications'), {
      ...verification,
      date: verification.date || new Date(),
    });
    return docRef.id;
  }

  static async updateVerificationStatus(
    id: string,
    status: Verification['status'],
    comment?: string
  ): Promise<void> {
    if (!id) {
      throw new Error('Verification ID is required');
    }

    const verificationRef = doc(db, 'verifications', id);
    const verificationDoc = await getDoc(verificationRef);

    if (!verificationDoc.exists()) {
      throw new Error('Verificação não encontrada');
    }

    await updateDoc(verificationRef, {
      status,
      ...(comment && { comment }),
      updatedAt: new Date(),
    });
  }
}
