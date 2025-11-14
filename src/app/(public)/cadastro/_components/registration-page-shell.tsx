import Link from 'next/link';
import type { ReactNode } from 'react';

export type RegistrationPageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  personaSummary: {
    heading: string;
    body: string;
    altLink: {
      label: string;
      href: string;
    };
  };
};

export function RegistrationPageShell({
  title,
  description,
  children,
  backHref = '/',
  backLabel = 'Voltar',
  personaSummary,
}: RegistrationPageShellProps) {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:gap-10 sm:px-6 sm:py-14">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-4 sm:max-w-xl">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
          >
            {backLabel}
          </Link>
          <div className="space-y-3 rounded-3xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface) 92%,white 8%)] px-6 py-5 shadow-xl shadow-black/20">
            <h1 className="text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">{title}</h1>
            <p className="text-sm text-[var(--muted)] sm:text-base">{description}</p>
          </div>
        </div>

        <aside className="space-y-3 rounded-3xl border border-[color-mix(in_srgb,var(--border) 82%,black 18%)] bg-[color-mix(in_srgb,var(--surface) 90%,black 10%)] px-5 py-6 text-sm text-[var(--muted)] shadow-lg shadow-black/20 sm:max-w-xs">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Para quem é</p>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{personaSummary.heading}</h2>
            <p>{personaSummary.body}</p>
          </div>
          <Link
            href={personaSummary.altLink.href}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] transition-colors hover:text-[var(--foreground)]"
          >
            {personaSummary.altLink.label}
          </Link>
        </aside>
      </div>

      <div className="rounded-3xl border border-[color-mix(in_srgb,var(--border) 78%,black 22%)] bg-[color-mix(in_srgb,var(--surface) 92%,black 8%)] p-6 shadow-inner shadow-black/25 sm:p-8">
        {children}
      </div>
    </section>
  );
}
