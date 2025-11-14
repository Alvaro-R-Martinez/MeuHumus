import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

import type { ProducerProfile, ReceiverProfile } from '@/domain/user/user';
import { getFirebaseFirestore } from '@/lib/firebase/client';

export const getProducerProfile = async (userId: string): Promise<ProducerProfile | null> => {
  const db = getFirebaseFirestore();
  const userRef = doc(db, 'users', userId);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as { producerProfile?: ProducerProfile };

  return data.producerProfile ?? null;
};

export const saveProducerProfile = async (userId: string, profile: ProducerProfile): Promise<void> => {
  const db = getFirebaseFirestore();
  const userRef = doc(db, 'users', userId);

  await setDoc(
    userRef,
    {
      producerProfile: profile,
    },
    { merge: true }
  );
};

export const getReceiverProfile = async (userId: string): Promise<ReceiverProfile | null> => {
  const db = getFirebaseFirestore();
  const userRef = doc(db, 'users', userId);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as { receiverProfile?: ReceiverProfile };

  return data.receiverProfile ?? null;
};

export const saveReceiverProfile = async (userId: string, profile: ReceiverProfile): Promise<void> => {
  const db = getFirebaseFirestore();
  const userRef = doc(db, 'users', userId);

  await setDoc(
    userRef,
    {
      receiverProfile: profile,
    },
    { merge: true }
  );
};

export const getUserBySealCode = async (sealCode: string): Promise<ProducerProfile | null> => {
  const db = getFirebaseFirestore();
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('producerProfile.sustainabilitySealCode', '==', sealCode));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const user = snapshot.docs[0].data() as { producerProfile?: ProducerProfile };
  return user.producerProfile ?? null;
};

export const generateSeal = async (userId: string): Promise<void> => {
  const db = getFirebaseFirestore();
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists() || !userSnap.data().producerProfile) {
    console.error('Producer not found or has no producer profile.');
    return;
  }

  const user = userSnap.data() as { producerProfile: ProducerProfile };
  const profile = user.producerProfile;

  if (profile.streakCount && profile.streakCount >= 100 && !profile.sustainabilitySealCode) {
    const { v4: uuidv4 } = await import('uuid');
    const sealCode = uuidv4();
    await updateDoc(userRef, {
      producerProfile: { ...profile, sustainabilitySealCode: sealCode },
    });
  } else if (!profile.streakCount || profile.streakCount < 100) {
    console.error('Producer does not meet streak requirement for seal.');
  }
  // Removido o erro para selo já existente, apenas retorna silenciosamente
};
