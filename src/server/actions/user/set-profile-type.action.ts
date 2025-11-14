'use server';

import { cookies } from 'next/headers';

import { firebaseAdminAuth } from '@/lib/firebase/admin';
import { setUserProfileType } from '@/services/firestore/users';
import type { UserProfileType } from '@/domain/user/user';

const SESSION_COOKIE = 'mh_session';

export type SetProfileTypeResult =
  | { success: true; profileType: UserProfileType }
  | { success: false; message: string };

export const setProfileTypeAction = async (
  profileType: UserProfileType
): Promise<SetProfileTypeResult> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return { success: false, message: 'Usuário não autenticado.' };
  }

    try {
    const auth = firebaseAdminAuth();
    if (!auth) {
      return { success: false, message: 'Firebase Admin Auth não está disponível. Credenciais não definidas.' };
    }
    const decoded = await auth.verifySessionCookie(token, true);
    await setUserProfileType({ userId: decoded.uid, profileType });
    return { success: true, profileType };
  } catch (error) {
    console.error('[setProfileTypeAction] Failed to set profile type', error);
    return { success: false, message: 'Não foi possível salvar seu tipo de perfil. Tente novamente.' };
  }
};
