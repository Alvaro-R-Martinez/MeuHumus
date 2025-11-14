import { firebaseAdmin, firebaseAdminDb } from '@/lib/firebase/admin';
import type { ProducerRegistrationData } from '@/lib/validators/producer';

export type CreateProducerProfileInput = {
  userId: string;
  payload: ProducerRegistrationData;
};

type ProducerProfileDocument = {
  contact: {
    businessName: string;
    document: string;
    email: string;
    phone: string;
  };
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
  };
  capacity: {
    averageDailyKg: number;
  };
  dailyCapacityKg: number;
  status: 'active' | 'pending' | 'suspended';
  createdAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
};

export const createProducerProfile = async ({ userId, payload }: CreateProducerProfileInput) => {
  const { contact, address, capacity } = payload;

  const db = firebaseAdminDb();
  if (!db) {
    throw new Error('Firebase Admin Firestore não está disponível. Credenciais não definidas.');
  }

  const docRef = db.collection('producers').doc(userId);

  const document: ProducerProfileDocument = {
    contact: {
      businessName: contact.businessName,
      document: contact.document,
      email: contact.email.toLowerCase(),
      phone: contact.phone,
    },
    address: {
      street: address.street,
      number: address.number,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      ...(typeof address.latitude === 'number' ? { latitude: address.latitude } : {}),
      ...(typeof address.longitude === 'number' ? { longitude: address.longitude } : {}),
    },
    capacity: {
      averageDailyKg: capacity.averageDailyKg,
    },
    dailyCapacityKg: capacity.averageDailyKg,
    status: 'pending',
    createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
  };

  await docRef.set(document, { merge: true });

  return { id: docRef.id };
};

export const getProducerProfile = async (userId: string) => {
  const db = firebaseAdminDb();
  if (!db) {
    return null;
  }
  const doc = await db.collection('producers').doc(userId).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data() as ProducerProfileDocument;

  return {
    id: doc.id,
    ...data,
  };
};
