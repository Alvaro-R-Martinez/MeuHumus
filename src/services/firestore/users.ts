import { firebaseAdmin, firebaseAdminDb } from '@/lib/firebase/admin';
import type { User, UserProfileType } from '@/domain/user/user';

export const getUserById = async (userId: string): Promise<User | null> => {
  const db = firebaseAdminDb();
  if (!db) {
    return null;
  }
  const doc = await db.collection('users').doc(userId).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data() as {
    email: string;
    profileType?: UserProfileType;
    createdAt?: FirebaseFirestore.Timestamp;
    updatedAt?: FirebaseFirestore.Timestamp;
  };

  return {
    id: doc.id,
    email: data.email,
    profileType: data.profileType,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    updatedAt: data.updatedAt?.toDate() ?? new Date(),
  };
};

export const upsertUser = async (params: {
  userId: string;
  email: string;
}): Promise<void> => {
  const { userId, email } = params;

  const db = firebaseAdminDb();
  if (!db) {
    throw new Error('Firebase Admin Firestore não está disponível. Credenciais não definidas.');
  }

  const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();

  await db
    .collection('users')
    .doc(userId)
    .set(
      {
        email: email.toLowerCase(),
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );
};

export const setUserProfileType = async (params: {
  userId: string;
  profileType: UserProfileType;
}): Promise<void> => {
  const { userId, profileType } = params;

  const db = firebaseAdminDb();
  if (!db) {
    throw new Error('Firebase Admin Firestore não está disponível. Credenciais não definidas.');
  }

  const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();

  await db
    .collection('users')
    .doc(userId)
    .set(
      {
        profileType,
        updatedAt: now,
      },
      { merge: true }
    );
};
