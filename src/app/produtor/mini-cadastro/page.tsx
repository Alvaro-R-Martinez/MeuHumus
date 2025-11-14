"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { getFirebaseAuth } from "@/lib/firebase/client";
import { getProducerProfile, saveProducerProfile } from "@/services/firestore/users-client";
import { useCities } from "@/hooks/use-cities";
import type { ProducerState } from "@/config/producer-cities";

export default function ProducerMiniCadastroPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState("");
  const [averageDailyWasteKg, setAverageDailyWasteKg] = useState("");
  const [stateId, setStateId] = useState<ProducerState | "">("");
  const [cityId, setCityId] = useState("");

  const { cities, loading: loadingCities, error: citiesError } = useCities();

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      setUserId(user.uid);
      setLoadingUser(false);
      setLoadingProfile(true);

      try {
        const profile = await getProducerProfile(user.uid);
        if (profile) {
          setName(profile.name);
          setAverageDailyWasteKg(String(profile.averageDailyWasteKg));
          setCityId(profile.cityId);
          const [stateFromId] = profile.cityId.split("-");
          setStateId(stateFromId as ProducerState);
        }
      } catch (err) {
        console.error("[ProducerMiniCadastroPage] Failed to load producer profile", err);
        setError("Não foi possível carregar seus dados de produtor. Tente novamente.");
      } finally {
        setLoadingProfile(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleNextStep = () => {
    if (!name.trim()) {
      setError("Informe seu nome.");
      return;
    }

    const parsedWaste = Number(averageDailyWasteKg.replace(",", "."));
    if (!Number.isFinite(parsedWaste) || parsedWaste <= 0 || parsedWaste > 10000) {
      setError("Informe uma produção média em kg/dia válida (entre 0 e 10.000).");
      return;
    }

    setError(null);
    setStep(2);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!userId) {
      setError("Usuário não autenticado.");
      return;
    }

    const parsedWaste = Number(averageDailyWasteKg.replace(",", "."));
    if (!Number.isFinite(parsedWaste) || parsedWaste <= 0 || parsedWaste > 10000) {
      setError("Informe uma produção média em kg/dia válida (entre 0 e 10.000).");
      setStep(1);
      return;
    }

    if (!stateId) {
      setError("Selecione o estado em que você habita.");
      return;
    }

    if (!cityId) {
      setError("Selecione a cidade em que você habita.");
      return;
    }

    setError(null);
    setSaving(true);

    try {
      await saveProducerProfile(userId, {
        name: name.trim(),
        averageDailyWasteKg: parsedWaste,
        cityId,
      });

      router.push("/produtor/dashboard");
    } catch (err) {
      console.error("[ProducerMiniCadastroPage] Failed to save producer profile", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Não foi possível salvar seu mini-cadastro de produtor. Tente novamente.");
      }
      setSaving(false);
    }
  };

  if (loadingUser || loadingProfile) {
    return null;
  }

  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center px-5 sm:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-12 sm:py-16">
        <section className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 px-5 py-6 shadow-sm sm:px-8 sm:py-8">
          <header className="space-y-3 text-center sm:space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">Mini-cadastro</p>
            <h1 className="text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
              Conte um pouco sobre você como produtor
            </h1>
            <p className="text-sm text-[var(--muted)] sm:text-base">
              Esses dados ajudam a conectar você com os receptores certos e a dimensionar a logística dos resíduos.
            </p>
          </header>

          <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit} noValidate>
            {step === 1 ? (
              <>
                <div className="space-y-2 text-sm text-[var(--muted)]">
                  <label className="block space-y-2">
                    <span>Nome</span>
                    <input
                      type="text"
                      className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--color-creme)] focus:border-[var(--color-caramelo)] focus:outline-none"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                    />
                  </label>
                </div>

                <div className="space-y-2 text-sm text-[var(--muted)]">
                  <label className="block space-y-2">
                    <span>Produção média de resíduos (kg/dia)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.1"
                      className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--color-creme)] focus:border-[var(--color-caramelo)] focus:outline-none"
                      value={averageDailyWasteKg}
                      onChange={(event) => setAverageDailyWasteKg(event.target.value)}
                      required
                    />
                  </label>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2 text-sm text-[var(--muted)]">
                    <span>Estado</span>
                    <select
                      className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--color-creme)] focus:border-[var(--color-caramelo)] focus:outline-none"
                      value={stateId}
                      onChange={(event) => {
                        const nextState = event.target.value as ProducerState;
                        setStateId(nextState);
                        setCityId("");
                      }}
                      required
                      disabled={loadingCities || !cities?.length}
                    >
                      <option value="" disabled>
                        {loadingCities ? "Carregando estados..." : "Selecione um estado"}
                      </option>
                      {Array.from(new Set(cities?.map((city) => city.state))).map((state) => (
                        <option key={state} value={state} className="bg-[var(--background)] text-[var(--foreground)]">
                          {state}
                        </option>
                      ))}
                    </select>
                    {citiesError ? (
                      <p className="text-xs text-red-400">{citiesError}</p>
                    ) : null}
                  </label>

                  <label className="block space-y-2 text-sm text-[var(--muted)]">
                    <span>Cidade em que você habita</span>
                    <select
                      className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--color-creme)] focus:border-[var(--color-caramelo)] focus:outline-none"
                      value={cityId}
                      onChange={(event) => setCityId(event.target.value)}
                      required
                      disabled={loadingCities || !cities?.length || !stateId}
                    >
                      <option value="" disabled>
                        {loadingCities
                          ? "Carregando cidades..."
                          : !stateId
                          ? "Selecione primeiro um estado"
                          : "Selecione uma cidade"}
                      </option>
                      {cities
                        ?.filter((city) => city.state === stateId)
                        .map((city) => (
                          <option key={city.id} value={city.id} className="bg-[var(--background)] text-[var(--foreground)]">
                            {city.name} - {city.state}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
              </>
            )}

            {error ? (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              {step === 2 && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  onClick={() => setStep(1)}
                  disabled={saving}
                >
                  Voltar
                </button>
              )}

              {step === 1 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full rounded-md bg-[var(--color-caramelo)] px-4 py-2 text-sm font-semibold text-[var(--color-trufa)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={saving}
                >
                  Continuar
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-md bg-[var(--color-caramelo)] px-4 py-2 text-sm font-semibold text-[var(--color-trufa)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {saving ? "Salvando..." : "Salvar e continuar"}
                </button>
              )}
            </div>
          </form>

          <p className="text-center text-xs text-[var(--muted)] sm:text-sm">
            Se preferir ajustar esses dados depois, você poderá editar seu perfil de produtor futuramente.
          </p>
        </section>

        <p className="text-center text-xs text-[var(--muted)] sm:text-sm">
          Se tiver dúvidas, você pode voltar para a{" "}
          <Link href="/" className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
            página inicial
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
