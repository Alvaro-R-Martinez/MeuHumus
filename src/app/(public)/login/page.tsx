import Link from 'next/link';

import { LoginForm } from './_components/login-form';

export default function LoginPage() {
  return (
    <main
      className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]"
      style={{ background: 'var(--background)' }}
    >
      <section className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-between gap-12 px-4 py-10 sm:justify-center sm:py-16">
        <div className="mx-auto w-full max-w-xl space-y-8 rounded-3xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface) 92%,white 8%)] px-6 py-8 shadow-2xl shadow-black/30 backdrop-blur-sm sm:px-8 sm:py-12">
          <header className="space-y-3 text-center">
            <p className="text-base font-semibold uppercase tracking-[0.4em] text-[var(--accent)]">MeuHúmus</p>
            <h1 className="text-2xl font-semibold sm:text-3xl">Bem-vindo de volta</h1>
            <p className="text-sm text-[var(--muted)] sm:text-base">
              Acesse e dê rumo ao resíduo.
            </p>
          </header>

          <LoginForm />

          <footer className="space-y-1.5 text-center text-sm text-[var(--muted)]">
            <p>
              Ainda não tem conta?
              <br className="hidden sm:block" />
              <Link href="/cadastro" className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
                Me cadastrar
              </Link>
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}
