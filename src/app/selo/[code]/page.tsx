"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

import { getUserBySealCode } from '@/services/firestore/users-client';
import type { ProducerProfile } from '@/domain/user/user';

export default function PublicSealPage() {
  const params = useParams<{ code: string }>();
  const code = params?.code as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [producer, setProducer] = useState<ProducerProfile | null>(null);

  useEffect(() => {
    if (!code) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getUserBySealCode(code);
        setProducer(result);
        if (!result) setError('Selo inválido ou não encontrado.');
      } catch (e) {
        setError('Falha ao validar o selo. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [code]);

  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[color-mix(in_srgb,var(--border)_80%,black_20%)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
          <Link href="/" className="text-sm font-semibold uppercase tracking-[0.4em] text-[var(--accent)]">
            MeuHúmus
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-16">
        {loading ? (
          <p className="text-sm text-[var(--muted)]">Validando selo...</p>
        ) : error ? (
          <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,black_6%)] p-6 text-sm">
            <p className="text-red-400">{error}</p>
            <Link href="/" className="text-[var(--accent)] hover:text-[var(--color-trufa)]">
              Voltar para a página inicial
            </Link>
          </div>
        ) : producer ? (
          <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,black_6%)] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">Selo de Sustentabilidade</p>
            <h1 className="text-2xl font-semibold">Selo válido</h1>
            <ul className="space-y-1 text-sm text-[var(--muted)]">
              <li>
                Produtor:{' '}
                <span className="font-semibold text-[var(--foreground)]">{producer.name}</span>
              </li>
              <li>
                Streak atual:{' '}
                <span className="font-semibold text-[var(--foreground)]">{producer.streakCount ?? 0}</span>
              </li>
            </ul>
          </div>
        ) : null}
      </section>
    </main>
  );
}
