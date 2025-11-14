'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import type { ProducerProfile, ReceiverProfile, UserProfileType } from '@/domain/user/user';
import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase/client';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export function ChooseProfileClient() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<null | UserProfileType>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }

      try {
        const db = getFirebaseFirestore();
        const userRef = doc(db, 'users', user.uid);
        const snapshot = await getDoc(userRef);

        if (snapshot.exists()) {
          const data = snapshot.data() as {
            profileType?: UserProfileType;
            producerProfile?: ProducerProfile;
            receiverProfile?: ReceiverProfile;
          };

          if (data.profileType === 'producer') {
            if (data.producerProfile) {
              router.replace('/produtor/dashboard');
            } else {
              router.replace('/produtor/mini-cadastro');
            }
            return;
          }

          if (data.profileType === 'receiver') {
            if (data.receiverProfile) {
              router.replace('/receptor/dashboard');
            } else {
              router.replace('/receptor/mini-cadastro');
            }
            return;
          }
        }
      } catch (err) {
        console.error('[ChooseProfileClient] Failed to load user profile', err);
      } finally {
        setLoadingUser(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleChoose = async (profileType: UserProfileType) => {
    if (submitting) return;

    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      router.replace('/login');
      return;
    }

    setSubmitting(profileType);
    setError(null);

    try {
      const db = getFirebaseFirestore();
      const userRef = doc(db, 'users', currentUser.uid);

      await setDoc(
        userRef,
        {
          email: currentUser.email?.toLowerCase() ?? '',
          profileType,
        },
        { merge: true }
      );

      if (profileType === 'producer') {
        const snapshot = await getDoc(userRef);
        const data = snapshot.data() as { producerProfile?: ProducerProfile } | undefined;

        if (!data || !data.producerProfile) {
          router.push('/produtor/mini-cadastro');
        } else {
          router.push('/produtor/dashboard');
        }
        return;
      }

      if (profileType === 'receiver') {
        const snapshot = await getDoc(userRef);
        const data = snapshot.data() as { receiverProfile?: ReceiverProfile } | undefined;

        if (!data || !data.receiverProfile) {
          router.push('/receptor/mini-cadastro');
        } else {
          router.push('/receptor/dashboard');
        }
        return;
      }
    } catch (err) {
      console.error('[ChooseProfileClient] Failed to save profile type', err);
      setError('Não foi possível salvar seu tipo de perfil. Tente novamente.');
      setSubmitting(null);
    }
  };

  if (loadingUser) {
    return null;
  }

  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center px-5 sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 py-12 sm:py-16">
        <section className="space-y-6">
          <header className="space-y-4 text-center sm:space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">Próximo passo</p>
            <h1 className="text-3xl font-semibold sm:text-4xl">Escolha em qual papel você quer entrar</h1>
            <p className="mx-auto max-w-2xl text-sm text-[var(--muted)] sm:text-base">
              A plataforma conecta quem gera resíduos orgânicos limpos com quem usa essa matéria-prima para criar
              compostos e adubos. Selecione o perfil que faz sentido para você.
            </p>
          </header>

          <section className="grid gap-5 md:grid-cols-2">
            <article className="space-y-4 rounded-3xl border border-[color-mix(in_srgb,var(--border) 78%,black 22%)] bg-[color-mix(in_srgb,var(--surface) 92%,black 8%)] px-6 py-7 text-sm text-[var(--muted)] shadow-inner shadow-black/20 sm:px-8">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">Sou produtor de resíduos</p>
                <p className="text-sm text-[var(--muted)] sm:text-base">
                  Restaurantes, cafés, mercados, escolas, cozinhas profissionais e indivíduos que querem dar um fim
                  correto às sobras orgânicas e mostrar compromisso real com clientes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleChoose('producer')}
                disabled={submitting === 'producer'}
                className="inline-flex w-full items-center justify-center rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--accent)] transition-colors duration-150 hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent) 20%,transparent)] hover:text-[var(--color-trufa)] disabled:opacity-60 sm:w-auto sm:justify-start"
              >
                {submitting === 'producer' ? 'Salvando...' : 'Continuar como produtor'}
              </button>
            </article>

            <article className="space-y-4 rounded-3xl border border-[color-mix(in_srgb,var(--border) 78%,black 22%)] bg-[color-mix(in_srgb,var(--surface) 92%,black 8%)] px-6 py-7 text-sm text-[var(--muted)] shadow-inner shadow-black/20 sm:px-8">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">Sou receptor / composteira</p>
                <p className="text-sm text-[var(--muted)] sm:text-base">
                  Composteiras urbanas, pequenos produtores e hortas comunitárias que transformam resíduos frescos em
                  húmus, adubos e novos alimentos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleChoose('receiver')}
                disabled={submitting === 'receiver'}
                className="inline-flex w-full items-center justify-center rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--accent)] transition-colors duração-150 hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent) 20%,transparent)] hover:text-[var(--color-trufa)] disabled:opacity-60 sm:w-auto sm:justify-start"
              >
                {submitting === 'receiver' ? 'Salvando...' : 'Continuar como receptor'}
              </button>
            </article>
          </section>

          {error ? (
            <p className="text-center text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <footer className="text-center text-xs text-[var(--muted)] sm:text-sm">
            <p>
              Se você tiver dúvidas sobre qual perfil escolher, pode voltar para a{' '}
              <Link href="/" className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
                página inicial
              </Link>
              .
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
}
