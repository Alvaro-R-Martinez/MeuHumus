import { signInWithEmailAndPassword } from 'firebase/auth';

import { getFirebaseAuth } from '@/lib/firebase/client';

export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginResult =
  | { success: true; user: { uid: string; email: string | null; idToken: string } }
  | { success: false; message: string };

export async function loginWithEmailPassword({
  email,
  password,
}: LoginCredentials): Promise<LoginResult> {
  const auth = getFirebaseAuth();

  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
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
    console.error('[loginWithEmailPassword] Failed to sign in', error);

    let message = 'Não foi possível entrar. Verifique seus dados e tente novamente.';

    if (typeof error === 'object' && error && 'code' in error) {
      const code = String((error as { code?: unknown }).code);

      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        message = 'Credenciais inválidas. Verifique e-mail e senha.';
      }

      if (code === 'auth/user-not-found') {
        message = 'Usuário não encontrado. Verifique o e-mail ou crie uma conta.';
      }
    }

    return {
      success: false,
      message,
    };
  }
}
