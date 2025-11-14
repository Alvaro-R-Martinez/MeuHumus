"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { loginWithEmailPassword } from '@/services/auth/login-with-email-password';

type LoginFormState = {
  email: string;
  password: string;
};

export function LoginForm() {
  const [form, setForm] = useState<LoginFormState>({ email: '', password: '' });
  const [message, setMessage] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const syncOffline = () => setOffline(!navigator.onLine);
    window.addEventListener('online', syncOffline);
    window.addEventListener('offline', syncOffline);
    return () => {
      window.removeEventListener('online', syncOffline);
      window.removeEventListener('offline', syncOffline);
    };
  }, []);

  const updateField = (field: keyof LoginFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (offline) {
      setMessage('Você está offline. Conecte-se para continuar.');
      return;
    }

    if (!form.email.trim()) {
      setMessage('Informe um e-mail válido.');
      return;
    }

    if (!form.password.trim()) {
      setMessage('Informe sua senha.');
      return;
    }

    setMessage('Entrando...');
    setSubmitting(true);

    const result = await loginWithEmailPassword({ email: form.email.trim(), password: form.password });

    if (!result.success) {
      setMessage(result.message);
      setSubmitting(false);
      return;
    }

    router.push('/escolher-perfil');
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        <InputField
          label="E-mail"
          type="email"
          value={form.email}
          onChange={(value) => updateField('email', value)}
        />

        <InputField
          label="Senha"
          type="password"
          value={form.password}
          onChange={(value) => updateField('password', value)}
        />

        <div className="space-y-2" aria-live="polite" aria-atomic="true">
          {message && (
            <p
              className={`rounded-lg border px-3 py-2 text-sm sm:text-base ${
                message.includes('construção')
                  ? 'border-[var(--border)] text-[var(--muted)]'
                  : 'border-[var(--accent)]/60 text-[var(--accent)]'
              }`}
            >
              {message}
            </p>
          )}
          {offline && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-900/30 px-3 py-2 text-xs text-amber-100 sm:text-sm">
              Conexão ausente: continue preenchendo, seus dados ficam salvos localmente.
            </p>
          )}
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--color-trufa)] transition-opacity hover:opacity-95 disabled:opacity-50"
          disabled={submitting}
        >
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="text-center text-xs text-[var(--muted)]">
          Quer entender melhor o fluxo?
          <br className="hidden sm:block" />
          <Link href="/" className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
            Ver explicação completa
          </Link>
        </p>
      </form>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  const inputId = `login-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="relative">
      <input
        id={inputId}
        className="peer w-full rounded-lg border border-[color-mix(in_srgb,var(--border) 85%,black 15%)] bg-[color-mix(in_srgb,var(--surface) 92%,black 8%)] px-3 pt-5 pb-1 text-sm text-[var(--foreground)] shadow-sm shadow-black/20 transition-all duration-150 placeholder-transparent focus:border-[var(--accent)] focus:outline-none focus:ring-0 sm:px-4 sm:pt-6 sm:pb-2"
        type={type}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder=" "
      />
      <label
        htmlFor={inputId}
        className="pointer-events-none absolute left-3 top-2 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-[var(--accent)] transition-all duration-150 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[color-mix(in_srgb,var(--muted) 80%,white 20%)] peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-[var(--accent)] sm:left-4"
      >
        {label}
      </label>
    </div>
  );
}
