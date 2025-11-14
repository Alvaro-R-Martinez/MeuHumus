'use server';

import { cookies } from 'next/headers';

import { firebaseAdminAuth } from '@/lib/firebase/admin';

const SESSION_COOKIE = 'mh_session';
const SESSION_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export const createSessionCookie = async (idToken: string) => {
  if (!idToken) {
    throw new Error('ID token is required to create a session.');
  }

  try {
    const auth = firebaseAdminAuth();
    if (!auth) {
      throw new Error('Firebase Admin Auth não está disponível. Credenciais não definidas.');
    }
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_COOKIE_MAX_AGE,
    });
    const cookieStore = await cookies();
    cookieStore.set({
      name: SESSION_COOKIE,
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_COOKIE_MAX_AGE / 1000,
    });

    return { success: true } as const;
  } catch (error) {
    console.error('[createSessionCookie] Failed to create session cookie', error);
    throw new Error('Não foi possível iniciar a sessão. Tente novamente.');
  }
};
