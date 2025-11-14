"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { signupWithEmailPassword } from "@/services/auth/signup-with-email-password";

type Step = "intro" | "form";

export default function CadastroPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("intro");
  const [isIntroTransitioning, setIsIntroTransitioning] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !password || !confirmPassword) {
      setError("Preencha todos os campos para continuar.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setError("Informe um e-mail válido.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const result = await signupWithEmailPassword({ email, password });

    if (!result.success) {
      setIsSubmitting(false);
      setError(result.message);
      return;
    }

    router.push("/escolher-perfil");
  };

  const handleGoToForm = () => {
    setIsIntroTransitioning(true);

    window.setTimeout(() => {
      setStep("form");
      setIsIntroTransitioning(false);
    }, 250);
  };

  const handleChooseProducer = () => {
    router.push("/produtor/cadastro");
  };

  const handleChooseReceiver = () => {
    router.push("/receptor/cadastro");
  };

  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center px-5 sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 py-12 sm:py-16">
        {step === "intro" && (
          <section
            className={`mx-auto w-full max-w-md space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 px-5 py-6 text-center shadow-sm sm:max-w-xl sm:px-6 sm:py-8 transition-opacity duration-300 ${isIntroTransitioning ? "opacity-0" : "opacity-100"}`}
          >
            <header className="space-y-3">
              <h1 className="text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
                Venha fazer parte de nosso ciclo de sustentabilidade
              </h1>
              <p className="text-sm text-[var(--muted)] sm:text-base">
                A forma como você lida com resíduos orgânicos hoje impacta diretamente o solo, a água e as comunidades
                ao seu redor. Queremos facilitar para quem se importa em fechar esse ciclo.
              </p>
            </header>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={handleGoToForm}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-[var(--color-caramelo)] px-4 py-2 text-sm font-semibold text-[var(--color-trufa)] transition-opacity hover:opacity-90"
              >
                Desejo ajudar o meio ambiente
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface) 94%,black 6%)] px-4 py-2 text-sm font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                Não ligo para o meio ambiente
              </button>
            </div>
          </section>
        )}

        {step === "form" && (
          <section className="mx-auto w-full max-w-md space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 px-5 py-6 shadow-sm sm:max-w-xl sm:px-6 sm:py-8">
            <header className="space-y-2 text-center sm:space-y-3">
              <h1 className="text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">Crie sua conta</h1>
              <p className="text-sm text-[var(--muted)] sm:text-base">
                Use um e-mail válido e uma senha segura. Depois, você poderá escolher se entra como produtor ou receptor.
              </p>
            </header>

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <label className="block space-y-2 text-sm text-[var(--muted)]">
                <span>E-mail</span>
                <input
                  type="email"
                  className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--color-creme)] focus:border-[var(--color-caramelo)] focus:outline-none"
                  placeholder="voce@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label className="block space-y-2 text-sm text-[var(--muted)]">
                <span>Senha</span>
                <input
                  type="password"
                  className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--color-creme)] focus:border-[var(--color-caramelo)] focus:outline-none"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                />
              </label>
              <label className="block space-y-2 text-sm text-[var(--muted)]">
                <span>Confirmar senha</span>
                <input
                  type="password"
                  className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--color-creme)] focus:border-[var(--color-caramelo)] focus:outline-none"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={6}
                />
              </label>

              {error ? (
                <p className="text-sm text-red-400" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-[var(--color-caramelo)] px-4 py-2 text-sm font-semibold text-[var(--color-trufa)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Criando conta..." : "Criar conta"}
              </button>

              <p className="text-center text-xs text-[var(--muted)] sm:text-sm">
                Já possui conta?{" "}
                <Link href="/login" className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
                  Acessar login
                </Link>
              </p>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
