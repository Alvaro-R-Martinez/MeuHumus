import { firebaseAdmin, firebaseAdminDb } from '@/lib/firebase/admin';
import type { ReceiverRegistrationData } from '@/lib/validators/receiver';

export type CreateReceiverProfileInput = {
  userId: string;
  payload: ReceiverRegistrationData;
};

const sumDailyCapacity = (data: ReceiverRegistrationData) =>
  Object.values(data.capacity.byDayKg).reduce((acc, value) => acc + value, 0);

export const createReceiverProfile = async ({
  userId,
  payload,
}: CreateReceiverProfileInput) => {
  const { basics, contact, coverage, capacity, materials, receivingWindow } = payload;

  const db = firebaseAdminDb();
  if (!db) {
    throw new Error('Firebase Admin Firestore não está disponível. Credenciais não definidas.');
  }

  const receiversDocRef = db.collection('receivers').doc(userId);
  const capacitySnapshotRef = db.collection('capacitySnapshots').doc(userId);

  const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();
  const dailyCapacityTotalKg = sumDailyCapacity(payload);

  await receiversDocRef.set(
    {
      basics,
      contact,
      coverage,
      capacity,
      materials,
      receivingWindow,
      dailyCapacityKg: dailyCapacityTotalKg,
      hasActivePlan: false,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  await capacitySnapshotRef.set(
    {
      byDayKg: capacity.byDayKg,
      totalDailyKg: dailyCapacityTotalKg,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  return {
    receiversDocRef,
    capacitySnapshotRef,
  };
};
