"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { getFirebaseAuth } from '@/lib/firebase/client';
import type { ProducerProfile } from '@/domain/user/user';
import type { ProducerState } from '@/config/producer-cities';
import { useCities } from '@/hooks/use-cities';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useIsMobileAndNotPWA } from '@/hooks/use-is-mobile';
import {
  loadStoredAppointments,
  removeStoredAppointment,
  upsertStoredAppointment,
} from '@/lib/offline/appointments-storage';
import { getProducerProfile } from '@/services/firestore/users-client';
import {
  createAppointmentWithCapacityCheck,
  listProducerAppointmentsForWeek,
  listReceiversWithWeeklyAvailability,
  type Appointment,
  type ReceiverWithCapacity,
} from '@/services/firestore/appointments-client';

type DashboardUser = {
  uid: string;
  email?: string | null;
  name?: string | null;
};

export default function ProdutorDashboardPage() {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [producerProfile, setProducerProfile] = useState<ProducerProfile | null>(null);
  const [selectedState, setSelectedState] = useState<ProducerState | ''>('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingReceivers, setLoadingReceivers] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  const [receivers, setReceivers] = useState<ReceiverWithCapacity[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [selectedReceiverId, setSelectedReceiverId] = useState<string | null>(null);
  const [appointmentDate, setAppointmentDate] = useState(''); // ISO: yyyy-mm-dd
  const [appointmentDateInput, setAppointmentDateInput] = useState(''); // exibido como dd/mm/aaaa
  const [appointmentVolume, setAppointmentVolume] = useState('');
  const [appointmentError, setAppointmentError] = useState<string | null>(null);
  const [savingAppointment, setSavingAppointment] = useState(false);

  const [activeTab, setActiveTab] = useState<'schedule' | 'appointments'>('schedule');
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);


  const { cities, loading: loadingCities, error: citiesError } = useCities();
  const { isOnline } = useOnlineStatus();
  const isMobileAndNotPWA = useIsMobileAndNotPWA();

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setProducerProfile(null);
        setLoadingUser(false);
        return;
      }

      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName,
      });

      setLoadingUser(false);
      setLoadingProfile(true);

      try {
        const profile = await getProducerProfile(firebaseUser.uid);
        if (profile) {
          setProducerProfile(profile);

          const [stateFromCityId] = profile.cityId.split('-');
          setSelectedState(stateFromCityId as ProducerState);
          setSelectedCityId(profile.cityId);
        }
      } finally {
        setLoadingProfile(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const availableStates = useMemo(() => {
    if (!cities) return [];
    return Array.from(new Set(cities.map((city) => city.state)));
  }, [cities]);

  const filteredCities = useMemo(() => {
    if (!cities || !selectedState) return [];
    return cities.filter((city) => city.state === selectedState);
  }, [cities, selectedState]);

  const mergeRemoteAndLocalAppointments = (remote: Appointment[], local: Appointment[]): Appointment[] => {
    const remoteIds = new Set(remote.map((item) => item.id));
    const extras = local.filter((item) => !remoteIds.has(item.id));
    return [...remote, ...extras];
  };

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoadingAppointments(true);
      try {
        const today = new Date();
        const remote = await listProducerAppointmentsForWeek(user.uid, today);
        const stored = loadStoredAppointments().filter((item) => item.producerId === user.uid);
        const merged = mergeRemoteAndLocalAppointments(remote, stored);
        setAppointments(merged);
      } finally {
        setLoadingAppointments(false);
      }
    };

    void load();
  }, [user]);


  useEffect(() => {
    if (!selectedState || !selectedCityId) {
      setReceivers([]);
      return;
    }

    const loadReceivers = async () => {
      setLoadingReceivers(true);
      try {
        const today = new Date();
        const list = await listReceiversWithWeeklyAvailability(selectedState as ProducerState, selectedCityId, today);
        setReceivers(list);
      } finally {
        setLoadingReceivers(false);
      }
    };

    void loadReceivers();
  }, [selectedState, selectedCityId]);

  const loading = loadingUser || loadingProfile || loadingCities;

  const handleDateInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 8) {
      value = value.slice(0, 8);
    }

    if (value.length > 4) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    } else if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }

    setAppointmentDateInput(value);
  };

  const handleCreateAppointment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (wizardStep === 1) {
      if (!appointmentDateInput) {
        setAppointmentError('Informe a data do agendamento no formato dd/mm/aaaa.');
        return;
      }

      const match = appointmentDateInput.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!match) {
        setAppointmentError('Use o formato de data dd/mm/aaaa.');
        return;
      }

      const [, dayStr, monthStr, yearStr] = match;
      const day = Number(dayStr);
      const month = Number(monthStr);
      const year = Number(yearStr);

      const dateObj = new Date(year, month - 1, day);

      if (
        !Number.isFinite(dateObj.getTime()) ||
        dateObj.getFullYear() !== year ||
        dateObj.getMonth() !== month - 1 ||
        dateObj.getDate() !== day
      ) {
        setAppointmentError('Data inválida. Verifique o dia, mês e ano informados.');
        return;
      }

      // Armazena internamente em formato ISO (yyyy-mm-dd) para o backend
      const iso = dateObj.toISOString().slice(0, 10);
      setAppointmentDate(iso);

      setAppointmentError(null);
      setWizardStep(2);
      return;
    }

    if (!user) {
      setAppointmentError('Usuário não autenticado.');
      return;
    }

    if (!selectedReceiverId) {
      setAppointmentError('Selecione um receptor para agendar.');
      return;
    }

    const volume = Number(appointmentVolume.replace(',', '.'));
    if (!Number.isFinite(volume) || volume <= 0) {
      setAppointmentError('Informe um volume válido em kg.');
      return;
    }

    const receiver = receivers.find((item) => item.id === selectedReceiverId);
    if (!receiver) {
      setAppointmentError('Receptor selecionado não encontrado.');
      return;
    }

    if (volume > receiver.weeklyAvailableKg) {
      setAppointmentError('O volume informado excede a capacidade semanal disponível do receptor.');
      return;
    }

    setAppointmentError(null);
    setSavingAppointment(true);

    try {
      const date = new Date(appointmentDate);
      const baseAppointment: Appointment = {
        id: `offline-${Date.now()}`,
        producerId: user.uid,
        receiverId: receiver.id,
        state: receiver.profile.address.state as ProducerState,
        cityId: receiver.profile.address.cityId,
        date: appointmentDate,
        volumeKg: volume,
        status: isOnline ? 'confirmed' : 'pending_sync',
      };

      if (!isOnline) {
        upsertStoredAppointment(baseAppointment);
        setAppointments((previous) => [...previous, baseAppointment]);
      } else {
        const result = await createAppointmentWithCapacityCheck({
          producerId: user.uid,
          receiverId: receiver.id,
          state: receiver.profile.address.state as ProducerState,
          cityId: receiver.profile.address.cityId,
          date,
          volumeKg: volume,
        });

        console.info('[ProdutorDashboardPage] Appointment created with id', result.id);

        const today = new Date();
        const remote = await listProducerAppointmentsForWeek(user.uid, today);
        const stored = loadStoredAppointments().filter((item) => item.producerId === user.uid);
        const merged = mergeRemoteAndLocalAppointments(remote, stored);
        setAppointments(merged);

        const receiversList = await listReceiversWithWeeklyAvailability(selectedState as ProducerState, selectedCityId, today);
        setReceivers(receiversList);
      }

      setAppointmentDate('');
      setAppointmentDateInput('');
      setAppointmentVolume('');
      setSelectedReceiverId(null);
      setWizardStep(1);
      setIsAppointmentModalOpen(false);
      setActiveTab('appointments');
    } catch (error) {
      console.error('[ProdutorDashboardPage] Failed to create appointment', error);
      setAppointmentError('Não foi possível salvar o agendamento. Tente novamente.');
    } finally {
      setSavingAppointment(false);
    }
  };

  useEffect(() => {
    if (!isOnline || !user) {
      return;
    }

    const syncPendingAppointments = async () => {
      const stored = loadStoredAppointments().filter(
        (item) => item.producerId === user.uid && item.status === 'pending_sync',
      );

      if (stored.length === 0) {
        return;
      }

      for (const localAppointment of stored) {
        try {
          const date = new Date(localAppointment.date);

          await createAppointmentWithCapacityCheck({
            producerId: localAppointment.producerId,
            receiverId: localAppointment.receiverId,
            state: localAppointment.state,
            cityId: localAppointment.cityId,
            date,
            volumeKg: localAppointment.volumeKg,
            clientRequestId: localAppointment.id,
          });

          removeStoredAppointment(localAppointment.id);
        } catch (error) {
          console.error('[ProdutorDashboardPage] Failed to sync appointment', error);
        }
      }

      const today = new Date();
      const remote = await listProducerAppointmentsForWeek(user.uid, today);
      const remainingStored = loadStoredAppointments().filter((item) => item.producerId === user.uid);
      const merged = mergeRemoteAndLocalAppointments(remote, remainingStored);
      setAppointments(merged);
    };

    void syncPendingAppointments();
  }, [isOnline, user]);

  if (loading) {
    return null;
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16">
      <header className="space-y-3 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">Dashboard</p>
        <h1 className="text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
          {user ? 'Agendamentos de entrega' : 'Sessão encerrada'}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          {user
            ? 'Escolha a região e selecione um receptor disponível para agendar sua entrega.'
            : 'Faça login novamente para acessar seu painel de agendamentos.'}
        </p>
        {!isOnline ? (
          <p className="text-xs text-yellow-400">
            Você está offline. Novos agendamentos ficarão pendentes de sincronização até a conexão ser
            restabelecida.
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-[var(--muted)] sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2">
              <span className="uppercase tracking-[0.25em]">Estado</span>
              <select
                className="rounded-full border border-[var(--border)] bg-transparent px-3 py-1 text-[var(--color-creme)] focus:border-[var(--color-caramelo)] focus:outline-none"
                value={selectedState}
                onChange={(event) => {
                  const nextState = event.target.value as ProducerState;
                  setSelectedState(nextState);
                  setSelectedCityId('');
                  setSelectedReceiverId(null);
                  setAppointmentDate('');
                  setAppointmentVolume('');
                  setAppointmentError(null);
                  setWizardStep(1);
                  setIsAppointmentModalOpen(false);
                }}
                disabled={loadingCities || !cities?.length}
              >
                <option value="" disabled>
                  {loadingCities ? 'Carregando...' : 'Selecionar'}
                </option>
                {availableStates.map((state) => (
                  <option
                    key={state}
                    value={state}
                    className="bg-[var(--background)] text-[var(--foreground)]"
                  >
                    {state}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2">
              <span className="uppercase tracking-[0.25em]">Cidade</span>
              <select
                className="rounded-full border border-[var(--border)] bg-transparent px-3 py-1 text-[var(--color-creme)] focus:border-[var(--color-caramelo)] focus:outline-none"
                value={selectedCityId}
                onChange={(event) => {
                  setSelectedCityId(event.target.value);
                  setSelectedReceiverId(null);
                  setAppointmentDate('');
                  setAppointmentVolume('');
                  setAppointmentError(null);
                  setWizardStep(1);
                  setIsAppointmentModalOpen(false);
                }}
                disabled={loadingCities || !filteredCities.length || !selectedState}
              >
                <option value="" disabled>
                  {loadingCities
                    ? 'Carregando...'
                    : !selectedState
                    ? 'Selecione um estado'
                    : 'Selecionar'}
                </option>
                {filteredCities.map((city) => (
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

          {selectedState && selectedCityId ? (
            <p>
              Região selecionada:{' '}
              <span className="font-semibold text-[var(--foreground)]">
                {selectedCityId.replace(`${selectedState}-`, '')} - {selectedState}
              </span>
            </p>
          ) : null}
        </div>
        {producerProfile ? (
          <div className="mt-4 grid gap-2 rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,black_6%)] p-4 text-sm text-[var(--muted)] sm:grid-cols-2">
            <p>
              Seu streak atual:{' '}
              <span className="font-semibold text-[var(--foreground)]">
                {producerProfile.streakCount ?? 0}
              </span>
            </p>
            {producerProfile.sustainabilitySealCode ? (
              <p className="sm:text-right">
                <Link
                  href={`/selo/${producerProfile.sustainabilitySealCode}`}
                  className="font-semibold text-[var(--accent)] hover:text-[var(--color-trufa)]"
                >
                  Ver selo de sustentabilidade
                </Link>
              </p>
            ) : (
              producerProfile.streakCount && producerProfile.streakCount >= 100 ? (
                <p className="sm:text-right">
                  <button
                    onClick={async () => {
                      if (!user) return;
                      try {
                        const { generateSeal } = await import('@/services/firestore/users-client');
                        await generateSeal(user.uid);
                        const updatedProfile = await getProducerProfile(user.uid);
                        if (updatedProfile) setProducerProfile(updatedProfile);
                        alert('Selo de sustentabilidade obtido com sucesso!');
                      } catch (error) {
                        console.error('Erro ao gerar selo:', error);
                        alert('Erro ao gerar selo. Tente novamente.');
                      }
                    }}
                    className="font-semibold text-[var(--accent)] hover:text-[var(--color-trufa)]"
                  >
                    Obter selo de sustentabilidade
                  </button>
                </p>
              ) : (
                <p className="sm:text-right">Conquiste o selo ao atingir 100 de streak.</p>
              )
            )}
          </div>
        ) : null}
      </header>

      <article className="space-y-4 rounded-3xl border border-[color-mix(in_srgb,var(--border) 82%,black 18%)] bg-[color-mix(in_srgb,var(--surface) 92%,black 8%)] p-6 shadow-inner shadow-black/25 sm:p-8">
        {isMobileAndNotPWA && (
          <div className="bg-yellow-500 text-black p-4 rounded-lg mb-4 text-sm text-center">
            <p className="font-semibold">Use nosso aplicativo PWA para uma melhor experiência!</p>
            <p>Adicione à tela inicial do seu dispositivo para acessar rapidamente.</p>
            <p className="text-xs mt-1">No Safari/Chrome, clique em "Compartilhar" e depois em "Adicionar à Tela Inicial".</p>
          </div>
        )}
        {!user ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--muted)]">
              Não encontramos uma sessão ativa. Volte para a página inicial e faça login para retomar o cadastro.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--color-trufa)] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              Ir para a página inicial
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex gap-2 rounded-full bg-[color-mix(in_srgb,var(--surface) 96%,black 4%)] p-1 text-xs font-semibold text-[var(--muted)]">
              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className={`flex-1 rounded-full px-3 py-1.5 transition-colors ${
                  activeTab === 'schedule'
                    ? 'bg-[var(--accent)] text-[var(--color-trufa)]'
                    : 'hover:text-[var(--accent)]'
                }`}
              >
                Agendar
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('appointments')}
                className={`flex-1 rounded-full px-3 py-1.5 transition-colors ${
                  activeTab === 'appointments'
                    ? 'bg-[var(--accent)] text-[var(--color-trufa)]'
                    : 'hover:text-[var(--accent)]'
                }`}
              >
                Meus agendamentos
              </button>
            </div>

            {activeTab === 'schedule' ? (
              <section className="space-y-4 text-sm text-[var(--muted)]">
                <div className="space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--muted)]">
                    Receptores disponíveis na região
                  </h2>
                  {!selectedState || !selectedCityId ? (
                    <p>Selecione estado e cidade para ver receptores disponíveis.</p>
                  ) : loadingReceivers ? (
                    <p>Carregando receptores disponíveis...</p>
                  ) : receivers.length === 0 ? (
                    <p>Nenhum receptor disponível nesta região com capacidade semanal livre.</p>
                  ) : (
                    <ul className="space-y-3">
                      {receivers.map((receiver) => {
                        const isFull = receiver.weeklyAvailableKg <= 0;

                        return (
                          <li
                            key={receiver.id}
                            className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface) 94%,black 6%)] p-3 sm:p-4"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-[var(--foreground)]">
                                  {receiver.profile.name}
                                </p>
                                <p className="text-xs text-[var(--muted)]">
                                  {receiver.profile.address.neighborhood}
                                  {receiver.profile.address.street
                                    ? ` • ${receiver.profile.address.street}, ${receiver.profile.address.number}`
                                    : ''}
                                </p>
                              </div>
                              <div className="space-y-1 text-xs text-[var(--muted)]">
                                <p>
                                  Capacidade semanal:{' '}
                                  <span className="font-semibold text-[var(--foreground)]">
                                    {receiver.weeklyCapacityKg.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 1,
                                    })}{' '}
                                    kg
                                  </span>
                                </p>
                                <p>
                                  Já agendado nesta semana:{' '}
                                  <span className="font-semibold text-[var(--foreground)]">
                                    {receiver.weeklyBookedKg.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 1,
                                    })}{' '}
                                    kg
                                  </span>
                                </p>
                                <p>
                                  Disponível nesta semana:{' '}
                                  <span className="font-semibold text-[var(--foreground)]">
                                    {receiver.weeklyAvailableKg.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 1,
                                    })}{' '}
                                    kg
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isFull) return;
                                  setSelectedReceiverId(receiver.id);
                                  setAppointmentDate('');
                                  setAppointmentVolume('');
                                  setAppointmentError(null);
                                  setWizardStep(1);
                                  setIsAppointmentModalOpen(true);
                                }}
                                disabled={isFull}
                                className="inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 bg-[var(--accent)] text-[var(--color-trufa)] hover:opacity-90"
                              >
                                {isFull ? 'Capacidade semanal esgotada' : 'Agendar'}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>
            ) : (
              <section className="space-y-4 text-sm text-[var(--muted)]">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--muted)]">
                    Meus agendamentos
                  </h2>
                </div>

                {loadingAppointments ? (
                  <p>Carregando agendamentos...</p>
                ) : appointments.length === 0 ? (
                  <p>Você ainda não tem agendamentos cadastrados nesta semana.</p>
                ) : (
                  <ul className="max-h-80 space-y-3 overflow-y-auto pr-1 text-xs">
                    {appointments.map((appointment) => {
                      const receiver = receivers.find((item) => item.id === appointment.receiverId);

                      return (
                        <li
                          key={appointment.id}
                          className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface) 96%,black 4%)] p-3"
                        >
                          <div className="flex flex-col gap-1">
                            <p className="text-[var(--foreground)]">
                              <span className="font-semibold">
                                {receiver ? receiver.profile.name : 'Receptor'}
                              </span>
                            </p>
                            <p>
                              Data:{' '}
                              <span className="font-semibold text-[var(--foreground)]">
                                {appointment.date.split('-').reverse().join('/')}
                              </span>
                            </p>
                            <p>
                              Quantidade:{' '}
                              <span className="font-semibold text-[var(--foreground)]">
                                {appointment.volumeKg.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 1,
                                })}{' '}
                                kg
                              </span>
                            </p>
                            <p>
                              Status:{' '}
                              <span className="font-semibold text-[var(--foreground)]">
                                {appointment.status === 'pending_sync'
                                  ? 'Pendente de sincronização'
                                  : 'Confirmado'}
                              </span>
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}

            {isAppointmentModalOpen && selectedReceiverId ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)] px-4">
                <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface) 96%,black 4%)] p-6 shadow-lg">
                  <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
                    <span>Agendamento</span>
                    <span>
                      {wizardStep === 1 && '1. Escolher data'}
                      {wizardStep === 2 && '2. Quantidade e limite'}
                    </span>
                  </div>

                  <form className="space-y-4" onSubmit={handleCreateAppointment}>
                    {wizardStep === 1 ? (
                      <div className="space-y-3 text-xs text-[var(--muted)]">
                        <p>Escolha a data em que o receptor irá receber o envio.</p>
                        <label className="block space-y-1">
                          <span>Data do agendamento</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="dd/mm/aaaa"
                            className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--color-creme)] focus:border-[var(--color-caramelo)] focus:outline-none"
                            value={appointmentDateInput}
                            onChange={handleDateInputChange}
                            required
                          />
                        </label>
                      </div>
                    ) : (
                      (() => {
                        const receiver = receivers.find((item) => item.id === selectedReceiverId);
                        if (!receiver) return null;

                        return (
                          <div className="space-y-3 text-xs text-[var(--muted)]">
                            <div>
                              <p className="text-[var(--foreground)]">
                                <span className="font-semibold">{receiver.profile.name}</span>
                              </p>
                              <p>
                                Disponível nesta semana (receptor):{' '}
                                <span className="font-semibold text-[var(--foreground)]">
                                  {receiver.weeklyAvailableKg.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 1,
                                  })}{' '}
                                  kg
                                </span>
                              </p>
                            </div>

                            <label className="block space-y-1">
                              <span>Quantidade a enviar (kg)</span>
                              <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step="0.1"
                                className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--color-creme)] focus:border-[var(--color-caramelo)] focus:outline-none"
                                value={appointmentVolume}
                                onChange={(event) => setAppointmentVolume(event.target.value)}
                                required
                              />
                            </label>
                          </div>
                        );
                      })()
                    )}

                    {appointmentError ? (
                      <p className="text-xs text-red-400" role="alert">
                        {appointmentError}
                      </p>
                    ) : null}

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full border border-[var(--border)] px-4 py-1.5 font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        onClick={() => {
                          if (wizardStep === 2) {
                            setWizardStep(1);
                            setAppointmentError(null);
                            return;
                          }

                          setIsAppointmentModalOpen(false);
                          setSelectedReceiverId(null);
                          setAppointmentDate('');
                          setAppointmentDateInput('');
                          setAppointmentVolume('');
                          setAppointmentError(null);
                          setWizardStep(1);
                        }}
                      >
                        {wizardStep === 1 ? 'Cancelar' : 'Voltar'}
                      </button>

                      <button
                        type="submit"
                        disabled={savingAppointment || (wizardStep === 1 && !appointmentDateInput)}
                        className="inline-flex items-center justify-center rounded-full bg-[var(--color-caramelo)] px-5 py-2 text-sm font-semibold text-[var(--color-trufa)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingAppointment
                          ? 'Salvando...'
                          : wizardStep === 1
                          ? 'Próximo'
                          : 'Confirmar agendamento'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </article>
    </section>
  );
}
