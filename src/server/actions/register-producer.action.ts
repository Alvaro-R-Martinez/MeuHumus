'use server';

import { cookies } from 'next/headers';

import { firebaseAdminAuth } from '@/lib/firebase/admin';
import {
  producerRegistrationSchema,
  type ProducerRegistrationData,
} from '@/lib/validators/producer';
import { createProducerProfile } from '@/services/firestore/producers';
import type { ZodIssue } from 'zod';

export type RegisterProducerActionResponse =
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
    const auth = firebaseAdminAuth();
    if (!auth) {
      throw new Error('Firebase Admin Auth não está disponível. Credenciais não definidas.');
    }
    const decoded = await auth.verifySessionCookie(token, true);
    return decoded.uid;
  } catch {
    return null;
  }
};

const formatZodErrors = (issues: ZodIssue[]) =>
  issues.reduce<Record<string, string>>((accumulator, issue) => {
    const key = issue.path.length > 0 ? issue.path.map(String).join('.') : 'form';

    if (!accumulator[key]) {
      accumulator[key] = issue.message;
    }

    return accumulator;
  }, {});

export const registerProducer = async (formData: unknown): Promise<RegisterProducerActionResponse> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, message: 'Usuário não autenticado.', errors: {} };
  }

  const parsed = producerRegistrationSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      errors: formatZodErrors(parsed.error.issues),
      message: 'Revise os campos destacados e tente novamente.',
    };
  }

  const payload: ProducerRegistrationData = parsed.data;

  try {
    await createProducerProfile({ userId, payload });
    return { success: true };
  } catch (error) {
    console.error('[registerProducer] Failed to create producer profile', error);
    return {
      success: false,
      errors: {},
      message: 'Erro ao salvar dados do produtor. Tente novamente.',
    };
  }
};
