'use server';

import { cookies } from 'next/headers';

import { firebaseAdminAuth } from '@/lib/firebase/admin';
import {
  receiverRegistrationSchema,
  type ReceiverRegistrationData,
} from '@/lib/validators/receiver';
import { createReceiverProfile } from '@/services/firestore/receivers';

export type RegisterReceiverActionResponse =
  | { success: true }
  | { success: false; errors: Record<string, string>; message?: string };

const SESSION_COOKIE = 'mh_session';

const getCurrentUserId = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    const auth = await firebaseAdminAuth();
    if (!auth) {
      throw new Error('Firebase Admin Auth não está disponível. Credenciais não definidas.');
    }
    const decoded = await auth.verifySessionCookie(token, true);
    return decoded.uid;
  } catch {
    return null;
  }
};

export const registerReceiver = async (formData: unknown): Promise<RegisterReceiverActionResponse> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, message: 'Usuário não autenticado.', errors: {} };
  }

  const parsed = receiverRegistrationSchema.safeParse(formData);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const formattedErrors: Record<string, string> = {};

    Object.entries(errors).forEach(([key, value]) => {
      if (value && value.length > 0) {
        formattedErrors[key] = value[0];
      }
    });

    return { success: false, errors: formattedErrors };
  }

  const payload: ReceiverRegistrationData = parsed.data;

  try {
    await createReceiverProfile({ userId, payload });
    return { success: true };
  } catch (error) {
    console.error('[registerReceiver] Failed to create receiver profile', error);
    return {
      success: false,
      errors: {},
      message: 'Erro ao salvar dados do receptor. Tente novamente.',
    };
  }
};
