"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { getFirebaseAuth } from "@/lib/firebase/client";
import { useCities } from "@/hooks/use-cities";
import type { ProducerState } from "@/config/producer-cities";
import type { Weekday } from "@/domain/user/user";
import { getReceiverProfile, saveReceiverProfile } from "@/services/firestore/users-client";

const WEEKDAYS: { id: Weekday; label: string }[] = [
  { id: "monday", label: "Segunda" },
  { id: "tuesday", label: "Terça" },
  { id: "wednesday", label: "Quarta" },
  { id: "thursday", label: "Quinta" },
  { id: "friday", label: "Sexta" },
  { id: "saturday", label: "Sábado" },
  { id: "sunday", label: "Domingo" },
];

export default function ReceiverMiniCadastroPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [name, setName] = useState("");
  const [weeklyCapacityKg, setWeeklyCapacityKg] = useState("");

  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [stateId, setStateId] = useState<ProducerState | "">("");
  const [cityId, setCityId] = useState("");

  const [receivingDays, setReceivingDays] = useState<Weekday[]>([]);
  const [receivingWindow, setReceivingWindow] = useState<{
    [day in Weekday]?: { start: string; end: string }[];
  }>({});

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
        const profile = await getReceiverProfile(user.uid);
        if (profile) {
          setName(profile.name);
          setWeeklyCapacityKg(String(profile.weeklyCapacityKg));

          setStreet(profile.address.street);
          setNumber(profile.address.number);
          setNeighborhood(profile.address.neighborhood);
          setPostalCode(profile.address.postalCode ?? "");
          setCityId(profile.address.cityId);
          const [stateFromId] = profile.address.cityId.split("-");
          setStateId(stateFromId as ProducerState);

          setReceivingDays(profile.receivingDays);
          setReceivingWindow(profile.receivingWindow);
        }
      } catch (err) {
        console.error("[ReceiverMiniCadastroPage] Failed to load receiver profile", err);
        setError("Não foi possível carregar seus dados de receptor. Tente novamente.");
      } finally {
        setLoadingProfile(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const toggleDay = (day: Weekday) => {
    setReceivingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addWindow = (day: Weekday) => {
    setReceivingWindow((prev) => {
      const current = prev[day] ?? [];
      return {
        ...prev,
        [day]: [...current, { start: "08:00", end: "18:00" }],
      };
    });
  };

  const updateWindow = (
    day: Weekday,
    index: number,
    field: "start" | "end",
    value: string,
  ) => {
    setReceivingWindow((prev) => {
      const current = prev[day] ?? [];
      const next = current.map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot,
      );
      return {
        ...prev,
        [day]: next,
      };
    });
  };

  const removeWindow = (day: Weekday, index: number) => {
    setReceivingWindow((prev) => {
      const current = prev[day] ?? [];
      const next = current.filter((_, i) => i !== index);
      return {
        ...prev,
        [day]: next,
      };
    });
  };

  const hasAnyWindow = useMemo(
    () => receivingDays.some((day) => (receivingWindow[day]?.length ?? 0) > 0),
    [receivingDays, receivingWindow],
  );

  const handleNextFromStep1 = () => {
    if (!name.trim()) {
      setError("Informe seu nome.");
      return;
    }

    const parsedCapacity = Number(weeklyCapacityKg.replace(",", "."));
    if (!Number.isFinite(parsedCapacity) || parsedCapacity <= 0 || parsedCapacity > 100000) {
      setError("Informe uma capacidade semanal válida (entre 0 e 100.000 kg).");
      return;
    }

    setError(null);
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    if (!street.trim() || !number.trim() || !neighborhood.trim()) {
      setError("Informe seu endereço completo (rua, número e bairro).");
      return;
    }

    if (!stateId) {
      setError("Selecione o estado em que você recebe resíduos.");
      return;
    }

    if (!cityId) {
      setError("Selecione a cidade em que você recebe resíduos.");
      return;
    }

    if (!postalCode.trim()) {
      setError("Informe o CEP do endereço.");
      return;
    }

    setError(null);
    setStep(3);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!userId) {
      setError("Usuário não autenticado.");
      return;
    }

    const parsedCapacity = Number(weeklyCapacityKg.replace(",", "."));
    if (!Number.isFinite(parsedCapacity) || parsedCapacity <= 0 || parsedCapacity > 100000) {
      setError("Informe uma capacidade semanal válida (entre 0 e 100.000 kg).");
      setStep(1);
      return;
    }

    if (!street.trim() || !number.trim() || !neighborhood.trim() || !postalCode.trim() || !stateId || !cityId) {
      setError("Revise os dados do endereço antes de continuar.");
      setStep(2);
      return;
    }

    if (!receivingDays.length) {
      setError("Selecione ao menos um dia em que pode receber resíduos.");
      return;
    }

    // validação básica de horários: start < end
    for (const day of receivingDays) {
      const slots = receivingWindow[day] ?? [];
      for (const slot of slots) {
        if (!slot.start || !slot.end || slot.start >= slot.end) {
          setError("Verifique os horários de recebimento: o horário inicial deve ser menor que o final.");
          return;
        }
      }
    }

    setError(null);
    setSaving(true);

    try {
      await saveReceiverProfile(userId, {
        name: name.trim(),
        weeklyCapacityKg: parsedCapacity,
        address: {
          street: street.trim(),
          number: number.trim(),
          neighborhood: neighborhood.trim(),
          state: stateId,
          cityId,
          postalCode: postalCode.trim(),
        },
        receivingDays,
        receivingWindow,
      });

      router.push("/receptor/dashboard");
    } catch (err) {
      console.error("[ReceiverMiniCadastroPage] Failed to save receiver profile", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Não foi possível salvar seu mini-cadastro de receptor. Tente novamente.");
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
              Conte um pouco sobre você como receptor
            </h1>
            <p className="text-sm text-[var(--muted)] sm:text-base">
              Esses dados ajudam a conectar você com produtores compatíveis e a planejar a logística de recebimento.
            </p>
          </header>

          <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit} noValidate>
            {step === 1 && (
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
                    <span>Capacidade semanal de resíduos (kg/semana)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.1"
                      className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--color-creme)] focus:border-[var(--color-caramelo)] focus:outline-none"
                      value={weeklyCapacityKg}
                      onChange={(event) => setWeeklyCapacityKg(event.target.value)}
                      required
                    />
                  </label>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2 text-sm text-[var(--muted)]">
                    <span>Rua / logradouro</span>
                    <input
                      type="text"
                      className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--color-creme)] focus:border-[var(--color-caramelo)] focus:outline-none"
                      value={street}
                      onChange={(event) => setStreet(event.target.value)}
                      required
                    />
                  </label>

                  <label className="block space-y-2 text-sm text-[var(--muted)]">
                    <span>Número</span>
                    <input
                      type="text"
                      className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--color-creme)] focus:border-[var(--color-caramelo)] focus:outline-none"
                      value={number}
                      onChange={(event) => setNumber(event.target.value)}
                      required
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2 text-sm text-[var(--muted)]">
                    <span>Bairro</span>
                    <input
                      type="text"
                      className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--color-creme)] focus:border-[var(--color-caramelo)] focus:outline-none"
                      value={neighborhood}
                      onChange={(event) => setNeighborhood(event.target.value)}
                      required
                    />
                  </label>

                  <label className="block space-y-2 text-sm text-[var(--muted)]">
                    <span>CEP</span>
                    <input
                      type="text"
                      className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--color-creme)] focus:border-[var(--color-caramelo)] focus:outline-none"
                      value={postalCode}
                      onChange={(event) => setPostalCode(event.target.value)}
                      required
                    />
                  </label>
                </div>

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
                        <option
                          key={state}
                          value={state}
                          className="bg-[var(--background)] text-[var(--foreground)]"
                        >
                          {state}
                        </option>
                      ))}
                    </select>
                    {citiesError ? (
                      <p className="text-xs text-red-400">{citiesError}</p>
                    ) : null}
                  </label>

                  <label className="block space-y-2 text-sm text-[var(--muted)]">
                    <span>Cidade</span>
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
                          <option
                            key={city.id}
                            value={city.id}
                            className="bg-[var(--background)] text-[var(--foreground)]"
                          >
                            {city.name} - {city.state}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <section className="space-y-3 text-sm text-[var(--muted)]">
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    Dias em que pode receber resíduos
                  </h2>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {WEEKDAYS.map((day) => (
                      <label
                        key={day.id}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface) 92%,black 8%)] px-3 py-1.5 text-xs sm:text-sm"
                      >
                        <input
                          type="checkbox"
                          className="h-3 w-3 rounded border-[var(--border)] bg-transparent text-[var(--accent)] focus:ring-[var(--accent)]"
                          checked={receivingDays.includes(day.id)}
                          onChange={() => toggleDay(day.id)}
                        />
                        <span>{day.label}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section className="space-y-3 text-sm text-[var(--muted)]">
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    Horários em que pode receber (por dia)
                  </h2>
                  {!receivingDays.length ? (
                    <p className="text-xs text-[var(--muted)]">
                      Selecione ao menos um dia acima para configurar horários de recebimento.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {receivingDays.map((day) => {
                        const slots = receivingWindow[day] ?? [];
                        const weekdayLabel = WEEKDAYS.find((w) => w.id === day)?.label ?? day;

                        return (
                          <div
                            key={day}
                            className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface) 94%,black 6%)] p-3 sm:p-4"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                                {weekdayLabel}
                              </span>
                              <button
                                type="button"
                                onClick={() => addWindow(day)}
                                className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--color-trufa)] hover:opacity-90"
                              >
                                Adicionar faixa
                              </button>
                            </div>

                            {slots.length === 0 ? (
                              <p className="text-xs text-[var(--muted)]">
                                Nenhum horário configurado. Clique em "Adicionar faixa" para definir intervalos de recebimento.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {slots.map((slot, index) => (
                                  <div
                                    key={index}
                                    className="grid grid-cols-[minmax(0,_1fr)_minmax(0,_1fr)_auto] items-center gap-2 text-xs sm:text-sm"
                                  >
                                    <div className="space-y-1">
                                      <span>Início</span>
                                      <input
                                        type="time"
                                        value={slot.start}
                                        onChange={(event) =>
                                          updateWindow(day, index, "start", event.target.value)
                                        }
                                        className="w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-[var(--color-creme)] focus:border-[var(--color-caramelo)] focus:outline-none"
                                        required
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <span>Fim</span>
                                      <input
                                        type="time"
                                        value={slot.end}
                                        onChange={(event) =>
                                          updateWindow(day, index, "end", event.target.value)
                                        }
                                        className="w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-[var(--color-creme)] focus:border-[var(--color-caramelo)] focus:outline-none"
                                        required
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeWindow(day, index)}
                                      className="mt-4 inline-flex items-center justify-center rounded-full border border-red-500 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10"
                                    >
                                      Remover
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {receivingDays.length > 0 && !hasAnyWindow && (
                    <p className="text-xs text-yellow-400">
                      Você selecionou dias de recebimento, mas ainda não configurou horários. Adicione pelo menos uma faixa por dia selecionado.
                    </p>
                  )}
                </section>
              </>
            )}

            {error ? (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              {step > 1 && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  onClick={() => setStep((current) => (current > 1 ? ((current - 1) as 1 | 2 | 3) : current))}
                  disabled={saving}
                >
                  Voltar
                </button>
              )}

              {step === 1 && (
                <button
                  type="button"
                  onClick={handleNextFromStep1}
                  className="w-full rounded-md bg-[var(--color-caramelo)] px-4 py-2 text-sm font-semibold text-[var(--color-trufa)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={saving}
                >
                  Continuar
                </button>
              )}

              {step === 2 && (
                <button
                  type="button"
                  onClick={handleNextFromStep2}
                  className="w-full rounded-md bg-[var(--color-caramelo)] px-4 py-2 text-sm font-semibold text-[var(--color-trufa)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={saving}
                >
                  Continuar
                </button>
              )}

              {step === 3 && (
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-md bg-[var(--color-caramelo)] px-4 py-2 text-sm font-semibold text-[var(--color-trufa)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {saving ? "Salvando..." : "Salvar e continuar"}
                </button>
              )}
            </div>

            <p className="text-center text-xs text-[var(--muted)] sm:text-sm">
              Se preferir ajustar esses dados depois, você poderá editar seu perfil de receptor futuramente.
            </p>
          </form>
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
