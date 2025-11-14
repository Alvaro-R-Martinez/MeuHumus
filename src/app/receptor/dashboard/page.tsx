"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { getFirebaseAuth } from '@/lib/firebase/client';
import { getProducerProfile, getReceiverProfile, saveReceiverProfile } from '@/services/firestore/users-client';
import type { ReceiverProfile, Weekday } from '@/domain/user/user';
import {
  type Appointment,
  type ReceiverConfirmationInput,
  type ReceiverConfirmationStatus,
  listReceiverAppointments,
  updateReceiverAppointmentConfirmation,
} from '@/services/firestore/appointments-client';

import { useOnlineStatus } from '@/hooks/use-online-status';
import { useIsMobileAndNotPWA } from '@/hooks/use-is-mobile';

type DashboardUser = {
  uid: string;
  email?: string | null;
  name?: string | null;
};

export default function ReceptorDashboardPage() {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [profile, setProfile] = useState<ReceiverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [problemNotes, setProblemNotes] = useState('');
  const [producerNames, setProducerNames] = useState<Record<string, string>>({});
  const [loadingProducerId, setLoadingProducerId] = useState<string | null>(null);

  const { isOnline } = useOnlineStatus();
  const isMobileAndNotPWA = useIsMobileAndNotPWA();

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

			setUser({
				uid: firebaseUser.uid,
				email: firebaseUser.email,
				name: firebaseUser.displayName,
			});

			try {
				const receiverProfile = await getReceiverProfile(firebaseUser.uid);
				setProfile(receiverProfile);
			} catch (err) {
				console.error('[ReceptorDashboardPage] Failed to load receiver profile', err);
				setError('Não foi possível carregar seu perfil de receptor.');
			} finally {
				setLoading(false);
			}
		});

		return () => unsubscribe();
	}, []);

	useEffect(() => {
		if (!user) return;

		const load = async () => {
			setLoadingAppointments(true);
			setAppointmentsError(null);

			try {
				const list = await listReceiverAppointments(user.uid);
				setAppointments(list);
			} catch (err) {
				console.error('[ReceptorDashboardPage] Failed to load receiver appointments', err);
				setAppointmentsError('Não foi possível carregar seus recebimentos.');
			} finally {
				setLoadingAppointments(false);
			}
		};

		void load();
	}, [user]);

	const formattedAddress = useMemo(() => {
		if (!profile) return null;
		const parts = [
			profile.address.street,
			`nº ${profile.address.number}`,
			profile.address.neighborhood,
			profile.address.postalCode,
		];
		return parts.filter(Boolean).join(' • ');
	}, [profile]);

	const selectedAppointment = useMemo(
		() => appointments.find((item) => item.id === selectedAppointmentId) ?? null,
		[appointments, selectedAppointmentId],
	);

	const getAppointmentStatusLabel = (appointment: Appointment) => {
		const baseDateLabel = appointment.date.split('-').reverse().join('/');

		if (appointment.receiverConfirmationStatus === 'confirmed') {
			return `Recebimento confirmado em ${baseDateLabel}`;
		}

		if (appointment.receiverConfirmationStatus === 'problem') {
			return `Problema registrado em ${baseDateLabel}`;
		}

		return 'Pendente de confirmação';
	};

	const canConfirmAppointment = (appointment: Appointment): boolean => {
		// Agora a confirmação é permitida para qualquer data;
		// só bloqueamos se já houve confirmação ou problema registrado.
		if (appointment.receiverConfirmationStatus && appointment.receiverConfirmationStatus !== 'pending') {
			return false;
		}

		return true;
	};

	const ensureProducerName = async (producerId: string) => {
		if (producerNames[producerId] || loadingProducerId === producerId) {
			return;
		}

		setLoadingProducerId(producerId);

		try {
			const producerProfile = await getProducerProfile(producerId);
			if (producerProfile?.name) {
				setProducerNames((current) => ({ ...current, [producerId]: producerProfile.name }));
			}
		} finally {
			setLoadingProducerId((current) => (current === producerId ? null : current));
		}
	};

	const handleReceiverConfirmation = async (
		appointment: Appointment,
		status: Exclude<ReceiverConfirmationStatus, 'pending'>,
		notes?: string,
	) => {
		if (!user) return;

		const input: ReceiverConfirmationInput = {
			appointmentId: appointment.id,
			status,
			notes: notes?.trim() ? notes.trim() : undefined,
		};

		setConfirming(true);
		setAppointmentsError(null);

		try {
			await updateReceiverAppointmentConfirmation(input);

			setAppointments((current) =>
				current.map((item) =>
					item.id === appointment.id
						? {
								...item,
								receiverConfirmationStatus: status,
								receiverConfirmationAt: new Date().toISOString(),
								receiverConfirmationNotes: input.notes ?? null,
						  }
						: item,
				),
			);
		} catch (err) {
			console.error('[ReceptorDashboardPage] Failed to confirm appointment', err);
			setAppointmentsError('Não foi possível registrar sua confirmação. Tente novamente.');
		} finally {
			setConfirming(false);
		}
	};

	if (loading) {
		return null;
	}

	return (
		<section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16">
			<header className="space-y-3 text-center sm:text-left">
				<p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">Dashboard</p>
				<h1 className="text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
					{user ? 'Você está logado como receptor' : 'Sessão encerrada'}
				</h1>
				<p className="text-sm text-[var(--muted)]">
					{user
						? 'Acompanhe pedidos de envio, gerencie sua capacidade e mantenha sua agenda de recebimentos atualizada.'
						: 'Faça login novamente para acessar seu painel de receptor.'}
				</p>
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
						<dl className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-1">
								<dt className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Receptor</dt>
								<dd className="text-base font-semibold text-[var(--foreground)]">{profile?.name ?? user.name ?? 'Nome não informado'}</dd>
							</div>
							<div className="space-y-1">
								<dt className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">E-mail</dt>
								<dd className="text-base font-semibold text-[var(--foreground)]">{user.email ?? 'E-mail não informado'}</dd>
							</div>
							<div className="space-y-1 sm:col-span-2">
								<dt className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Identificador</dt>
								<dd className="break-all text-base font-semibold text-[var(--foreground)]">{user.uid}</dd>
							</div>
						</dl>

						{error ? (
							<p className="text-sm text-red-400" role="alert">
								{error}
							</p>
						) : null}

						{profile ? (
							<div className="space-y-4">
								<div className="space-y-1">
									<h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--muted)]">
										Capacidade semanal
									</h2>
									<p className="text-base font-semibold text-[var(--foreground)]">
										{profile.weeklyCapacityKg.toLocaleString('pt-BR', {
											minimumFractionDigits: 0,
											maximumFractionDigits: 1,
										})}{' '}
										kg/semana
									</p>
								</div>

								<div className="space-y-1">
									<h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--muted)]">
										Endereço de recebimento
									</h2>
									<p className="text-sm text-[var(--foreground)]">
										{formattedAddress ?? 'Endereço não informado'}
									</p>
								</div>

								<div className="space-y-2">
									<h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--muted)]">
										Agenda de recebimentos
									</h2>
									{profile.receivingDays.length === 0 ? (
										<p className="text-sm text-[var(--muted)]">
											Você ainda não configurou dias e horários de recebimento.
										</p>
									) : (
										<ul className="space-y-2 text-sm text-[var(--muted)]">
											{profile.receivingDays.map((day) => {
												const slots = profile.receivingWindow[day] ?? [];
												const labelMap: Record<string, string> = {
													monday: 'Segunda',
													tuesday: 'Terça',
													wednesday: 'Quarta',
													thursday: 'Quinta',
													friday: 'Sexta',
													saturday: 'Sábado',
													sunday: 'Domingo',
												};
												const dayLabel = labelMap[day] ?? day;

												return (
													<li key={day}>
														<span className="font-semibold text-[var(--foreground)]">{dayLabel}: </span>
														{slots.length === 0
																? 'sem horários configurados'
																: slots
																	.map((slot) => `${slot.start}–${slot.end}`)
																	.join(' • ')}
													</li>
												);
											})}
										</ul>
									)}
									<div className="mt-3 flex justify-start">
										<Link
											href="/receptor/mini-cadastro"
											className="inline-flex items-center justify-center rounded-full border border-[var(--border)] px-4 py-1.5 text-xs font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
										>
											Ajustar meus horários de recebimento
										</Link>
									</div>
								</div>

								<div className="space-y-3 border-t border-[var(--border)] pt-4">
									<h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--muted)]">
										Seus recebimentos
									</h2>
									{appointmentsError ? (
										<p className="text-xs text-red-400" role="alert">
											{appointmentsError}
										</p>
									) : null}
									{loadingAppointments ? (
										<p className="text-sm text-[var(--muted)]">Carregando seus recebimentos...</p>
									) : appointments.length === 0 ? (
										<p className="text-sm text-[var(--muted)]">
											Nenhum recebimento encontrado.
										</p>
									) : (
										<ul className="space-y-3 text-sm text-[var(--muted)]">
											{appointments.map((appointment) => {
												const canConfirm = canConfirmAppointment(appointment);
												const dateLabel = appointment.date.split('-').reverse().join('/');

												return (
													<li
														key={appointment.id}
														className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface) 94%,black 6%)] p-3 sm:p-4"
													>
														<div
															role="button"
															onClick={() => {
																void ensureProducerName(appointment.producerId);
																setSelectedAppointmentId((current) =>
																	current === appointment.id ? null : appointment.id,
																);
																setProblemNotes('');
															}}
															className="flex w-full flex-col items-start gap-2 text-left"
														>
															<div className="flex w-full flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
																<div className="space-y-0.5">
																	<p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
																		Recebimento em {dateLabel}
																	</p>
																	<p className="text-sm font-semibold text-[var(--foreground)]">
																		Volume previsto:{' '}
																		{appointment.volumeKg.toLocaleString('pt-BR', {
																			minimumFractionDigits: 0,
																			maximumFractionDigits: 1,
																		})}{' '}
																		kg
																	</p>
																</div>
																<p className="text-xs text-[var(--muted)]">
																	{getAppointmentStatusLabel(appointment)}
																</p>
															</div>

															{selectedAppointmentId === appointment.id && (
																<div className="mt-3 w-full space-y-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
																	<p>
																		<strong className="font-semibold text-[var(--foreground)]">Produtor:</strong>{' '}
																		{loadingProducerId === appointment.producerId
																				? 'Carregando nome do produtor...'
																				: producerNames[appointment.producerId] ?? 'Produtor não encontrado'}
																	</p>
																	<p>
																		<strong className="font-semibold text-[var(--foreground)]">Histórico:</strong>{' '}
																		Agendado para {dateLabel}
																		{appointment.receiverConfirmationAt
																				? ` • Confirmado em ${new Date(appointment.receiverConfirmationAt).toLocaleDateString('pt-BR')}`
																				: appointment.receiverConfirmationStatus === 'problem' && appointment.receiverConfirmationNotes
																				? ' • Problema registrado'
																				: ''}
																	</p>
																	<p>
																		Confirme se você recebeu o material com segurança ou registre um problema.
																	</p>
																	<div className="flex flex-wrap gap-2">
																		<button
																			type="button"
																			disabled={!canConfirm || confirming}
																			onClick={() => handleReceiverConfirmation(appointment, 'confirmed')}
																			className="inline-flex items-center justify-center rounded-full bg-[var(--color-caramelo)] px-4 py-1.5 text-xs font-semibold text-[var(--color-trufa)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
																		>
																			{confirming ? 'Salvando...' : 'Confirmar recebimento com segurança'}
																		</button>
																		<button
																			type="button"
																			disabled={!canConfirm || confirming}
																			className="inline-flex items-center justify-center rounded-full border border-[var(--border)] px-4 py-1.5 text-xs font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
																			onClick={(event) => {
																				event.stopPropagation();
																			}}
																		>
																			Houve algum problema?
																		</button>
																	</div>
																	<div className="mt-2 space-y-2">
																		<label className="block space-y-1">
																			<span>Descreva rapidamente o problema (se houver):</span>
																			<textarea
																				rows={2}
																				className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-xs text-[var(--color-creme)] focus:border-[var(--color-caramelo)] focus:outline-none"
																				value={problemNotes}
																				onChange={(event) => setProblemNotes(event.target.value)}
																			/>
																		</label>
																		<div className="flex justify-end">
																			<button
																				type="button"
																				disabled={!canConfirm || confirming || !problemNotes.trim()}
																				onClick={() => handleReceiverConfirmation(appointment, 'problem', problemNotes)}
																				className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-[var(--color-trufa)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
																			>
																				{confirming ? 'Salvando...' : 'Registrar problema'}
																			</button>
																		</div>
																	</div>
																</div>
															)}
														</div>
													</li>
												);
											})}
										</ul>
									)}
								</div>
								</div>
						) : (
							<p className="text-sm text-[var(--muted)]">
								Seu mini-cadastro de receptor ainda não foi encontrado. Complete-o para aproveitar melhor a plataforma.
							</p>
						)}
					</div>
				)}
			</article>
		</section>
	);
}
