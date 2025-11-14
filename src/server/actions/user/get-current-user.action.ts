'use server';

import { cookies } from 'next/headers';

import { firebaseAdminAuth } from '@/lib/firebase/admin';
import { getUserById } from '@/services/firestore/users';
import type { User } from '@/domain/user/user';

const SESSION_COOKIE = 'mh_session';

export type GetCurrentUserResult =
  | { authenticated: false }
  | { authenticated: true; user: User | null };

export const getCurrentUser = async (): Promise<GetCurrentUserResult> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return { authenticated: false };
  }

  try {
    const auth = firebaseAdminAuth();
    if (!auth) {
      throw new Error('Firebase Admin Auth não está disponível. Credenciais não definidas.');
    }
    const decoded = await auth.verifySessionCookie(token, true);

    const user = await getUserById(decoded.uid);

    return {
      authenticated: true,
      user,
    };
  } catch {
    return { authenticated: false };
  }
};
