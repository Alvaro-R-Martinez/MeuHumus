'use client';

import Link from 'next/link';

export function AuthLanding() {
  return (
    <section className="mx-auto w-full max-w-md space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 px-5 py-6 shadow-sm sm:max-w-xl sm:px-6 sm:py-8">
      <header className="space-y-2 text-center sm:space-y-3">
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">Acesse sua conta</h2>
        <p className="text-sm text-[var(--muted)] sm:text-base">Informe seus dados para continuar.</p>
      </header>

      <LoginFormPlaceholder />

      <div className="space-y-3 text-center text-sm text-[var(--muted)] sm:text-base">
        <p className="font-medium text-[var(--foreground)]">Novo por aqui?</p>
        <p>Escolha como deseja entrar na rede:</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/cadastro-produtor"
            className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface) 94%,black 6%)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Sou produtor
          </Link>
          <Link
            href="/cadastro-receptor"
            className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface) 94%,black 6%)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Sou receptor
          </Link>
        </div>
        <div>
          <p>Já possui conta?</p>
          <Link
            href="/login"
            className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
          >
            Acessar login
          </Link>
        </div>
      </div>
    </section>
  );
}

function LoginFormPlaceholder() {
  return (
    <form className="space-y-4">
      <label className="block space-y-2 text-sm text-[var(--muted)]">
        <span>E-mail</span>
        <input
          type="email"
          className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--color-creme)] focus:border-[var(--color-caramelo)] focus:outline-none"
          placeholder="voce@email.com"
        />
      </label>
      <label className="block space-y-2 text-sm text-[var(--muted)]">
        <span>Senha</span>
        <input
          type="password"
          className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--color-creme)] focus:border-[var(--color-caramelo)] focus:outline-none"
        />
      </label>
      <button
        type="button"
        className="w-full rounded-md bg-[var(--color-caramelo)] px-4 py-2 text-sm font-semibold text-[var(--color-trufa)] transition-opacity hover:opacity-90"
      >
        Entrar
      </button>
    </form>
  );
}
