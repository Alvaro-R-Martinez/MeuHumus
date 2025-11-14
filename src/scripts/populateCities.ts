import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { PRODUCER_CITIES_BY_STATE } from '@/config/producer-cities';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};

function getFirebaseApp() {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApps()[0];
}

function slugifyCity(state: string, city: string): string {
  return (
    state.toLowerCase() +
    '-' +
    city
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

export async function populateCities() {
  const app = getFirebaseApp();
  const db = getFirestore(app);

  const entries = Object.entries(PRODUCER_CITIES_BY_STATE) as [string, readonly string[]][];

  for (const [state, cities] of entries) {
    for (const city of cities) {
      const id = slugifyCity(state, city);

      const ref = doc(db, 'cities', id);
      await setDoc(ref, {
        id,
        name: city,
        state,
        createdAt: new Date().toISOString(),
      });

      console.log(`Criada/atualizada cidade: ${state} - ${city} (id: ${id})`);
    }
  }

  console.log('Finalizado populate de cidades.');
}
