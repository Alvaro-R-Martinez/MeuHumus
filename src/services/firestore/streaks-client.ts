import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseFirestore } from '../../lib/firebase/client';
import { User } from '../../domain/user/user';

import { v4 as uuidv4 } from 'uuid';

const db = getFirebaseFirestore();

// Helper to get today's date in YYYY-MM-DD format
const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to calculate the difference in days between two dates
const daysBetween = (dateString1: string, dateString2: string) => {
  const date1 = new Date(dateString1);
  const date2 = new Date(dateString2);
  const differenceMs = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(differenceMs / (1000 * 60 * 60 * 24));
};

export const updateStreak = async (producerId: string) => {
  const userRef = doc(db, 'users', producerId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists() || !userSnap.data().producerProfile) {
    console.error('Producer not found or has no producer profile.');
    return;
  }

  const user = userSnap.data() as User;
  const profile = user.producerProfile!;

  let streakCount = profile.streakCount || 0;
  const lastUpdate = profile.lastStreakUpdate;
  const today = getTodayDateString();

  if (lastUpdate) {
    const diff = daysBetween(lastUpdate, today);
    if (diff > 7) {
      streakCount = 0; // Reset streak
    }
  }

  streakCount += 1;

  const updatedProfile: Partial<User['producerProfile']> = {
    streakCount,
    lastStreakUpdate: today,
  };

  // Remover selo se streak cair abaixo de 100
  if (streakCount < 100 && profile.sustainabilitySealCode) {
    updatedProfile.sustainabilitySealCode = undefined;
  }

  await updateDoc(userRef, {
    producerProfile: { ...profile, ...updatedProfile },
  });
};
