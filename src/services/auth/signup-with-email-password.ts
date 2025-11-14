import { createUserWithEmailAndPassword } from 'firebase/auth';

import { getFirebaseAuth } from '@/lib/firebase/client';

export type SignupCredentials = {
  email: string;
  password: string;
};

export type SignupResult =
  | { success: true; user: { uid: string; email: string | null; idToken: string } }
  | { success: false; message: string };

export async function signupWithEmailPassword({ email, password }: SignupCredentials): Promise<SignupResult> {
  const auth = getFirebaseAuth();

  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    const idToken = await user.getIdToken();

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        idToken,
      },
    };
  } catch (error) {
    console.error('[signupWithEmailPassword] Failed to create user', error);

    let message = 'Não foi possível criar sua conta. Tente novamente.';

    if (typeof error === 'object' && error && 'code' in error) {
      const code = String((error as { code?: unknown }).code);

      if (code === 'auth/email-already-in-use') {
        message = 'Este e-mail já está em uso. Tente fazer login ou usar outro e-mail.';
      }

      if (code === 'auth/weak-password') {
        message = 'A senha informada é muito fraca. Use pelo menos 6 caracteres.';
      }

      if (code === 'auth/invalid-email') {
        message = 'E-mail inválido. Verifique o endereço digitado.';
      }
    }

    return {
      success: false,
      message,
    };
  }
}
