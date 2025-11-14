import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  updateDoc,
  where,
  Timestamp,
  increment,
  arrayUnion,
} from 'firebase/firestore';

import { getFirebaseFirestore } from '@/lib/firebase/client';
import { updateStreak } from './streaks-client';
import type { ProducerState } from '@/config/producer-cities';
import type { ProducerProfile, ReceiverProfile } from '@/domain/user/user';
import type { WeeklyCapacity } from '@/domain/appointments/capacity';

export type AppointmentStatus = 'confirmed' | 'pending_sync' | 'sync_error';

export type ReceiverConfirmationStatus = 'pending' | 'confirmed' | 'problem';

export type Appointment = {
  id: string;
  producerId: string;
  receiverId: string;
  state: ProducerState;
  cityId: string;
  date: string;
  volumeKg: number;
  status: AppointmentStatus;
  clientRequestId?: string;
  receiverConfirmationStatus?: ReceiverConfirmationStatus;
  receiverConfirmationAt?: string | null;
  receiverConfirmationNotes?: string | null;
};

export type ReceiverWithCapacity = {
  id: string;
  profile: ReceiverProfile;
  weeklyCapacityKg: number;
  weeklyBookedKg: number;
  weeklyAvailableKg: number;
};

const APPOINTMENTS_COLLECTION = 'appointments';
const USERS_COLLECTION = 'users';
const WEEKLY_CAPACITIES_COLLECTION = 'weeklyCapacities';

const getWeekInfo = (date: Date) => {
  const tempDate = new Date(date.valueOf());
  const dayNum = (date.getUTCDay() + 6) % 7;
  tempDate.setUTCDate(tempDate.getUTCDate() - dayNum + 3);
  const firstThursday = tempDate.valueOf();
  tempDate.setUTCMonth(0, 1);
  if (tempDate.getUTCDay() !== 4) {
    tempDate.setUTCMonth(0, 1 + ((4 - tempDate.getUTCDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - tempDate.valueOf()) / 604800000);

  const start = new Date(date);
  const day = start.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  return {
    year: date.getFullYear(),
    weekNumber,
    weekStartsOn: start,
  };
};


export const listReceiversWithWeeklyAvailability = async (
  state: ProducerState,
  cityId: string,
  referenceDate: Date,
): Promise<ReceiverWithCapacity[]> => {
  const db = getFirebaseFirestore();

  const usersRef = collection(db, USERS_COLLECTION);
  const q = query(usersRef, where('receiverProfile.address.state', '==', state), where('receiverProfile.address.cityId', '==', cityId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return [];

  const receivers: { id: string; profile: ReceiverProfile }[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data() as { receiverProfile?: ReceiverProfile };
    if (data.receiverProfile) {
      receivers.push({ id: doc.id, profile: data.receiverProfile });
    }
  });

  if (!receivers.length) return [];

  const { year, weekNumber } = getWeekInfo(referenceDate);
  const capacityDocsIds = receivers.map(({ id }) => `${id}_${year}-${weekNumber}`);
  const capacityDocsPromises = capacityDocsIds.map((id) => getDoc(doc(db, WEEKLY_CAPACITIES_COLLECTION, id)));
  const capacityDocsSnapshots = await Promise.all(capacityDocsPromises);

  const bookedByReceiver = new Map<string, number>();
  capacityDocsSnapshots.forEach((snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data() as WeeklyCapacity;
      bookedByReceiver.set(data.receiverId, data.bookedKg);
    }
  });

  return receivers.map(({ id, profile }) => {
    const weeklyCapacityKg = profile.weeklyCapacityKg ?? 0;
    const weeklyBookedKg = bookedByReceiver.get(id) ?? 0;
    const weeklyAvailableKg = Math.max(0, weeklyCapacityKg - weeklyBookedKg);

    return {
      id,
      profile,
      weeklyCapacityKg,
      weeklyBookedKg,
      weeklyAvailableKg,
    };
  });
};

export type CreateAppointmentInput = {
  producerId: string;
  receiverId: string;
  state: ProducerState;
  cityId: string;
  date: Date;
  volumeKg: number;
  clientRequestId?: string;
};

export const createAppointmentWithCapacityCheck = async (
  input: CreateAppointmentInput,
): Promise<{ id: string }> => {
  const db = getFirebaseFirestore();
  const { producerId, receiverId, state, cityId, date, volumeKg, clientRequestId } = input;

  const { year, weekNumber, weekStartsOn } = getWeekInfo(date);
  const weeklyCapacityDocId = `${receiverId}_${year}-${weekNumber}`;

  try {
    const appointmentId = await runTransaction(db, async (transaction) => {
      const receiverRef = doc(db, USERS_COLLECTION, receiverId);
      const receiverSnap = await transaction.get(receiverRef);
      if (!receiverSnap.exists() || !receiverSnap.data().receiverProfile) {
        throw new Error('Perfil de receptor não encontrado.');
      }
      const receiverProfile = receiverSnap.data().receiverProfile as ReceiverProfile;

      const capacityRef = doc(db, WEEKLY_CAPACITIES_COLLECTION, weeklyCapacityDocId);
      const capacitySnap = await transaction.get(capacityRef);

      let currentBookedKg = 0;
      let weekCapacity = receiverProfile.weeklyCapacityKg ?? 0;

      if (capacitySnap.exists()) {
        const capacityData = capacitySnap.data() as WeeklyCapacity;
        currentBookedKg = capacityData.bookedKg;
        weekCapacity = capacityData.baseCapacityKg; // Use a capacidade já definida para a semana
      }

      const availableKg = weekCapacity - currentBookedKg;
      if (volumeKg > availableKg) {
        throw new Error('O volume informado excede a capacidade semanal disponível do receptor.');
      }

      const newAppointmentRef = doc(collection(db, APPOINTMENTS_COLLECTION));
      transaction.set(newAppointmentRef, {
        producerId,
        receiverId,
        state,
        cityId,
        date: Timestamp.fromDate(date),
        volumeKg,
        status: 'confirmed',
        clientRequestId: clientRequestId ?? null,
        receiverConfirmationStatus: 'pending',
        receiverConfirmationAt: null,
        receiverConfirmationNotes: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      if (capacitySnap.exists()) {
        transaction.update(capacityRef, {
          bookedKg: increment(volumeKg),
          appointmentIds: arrayUnion(newAppointmentRef.id),
        });
      } else {
        transaction.set(capacityRef, {
          receiverId,
          year,
          weekNumber,
          weekStartsOn: Timestamp.fromDate(weekStartsOn),
          baseCapacityKg: receiverProfile.weeklyCapacityKg ?? 0,
          bookedKg: volumeKg,
          appointmentIds: [newAppointmentRef.id],
        });
      }

      return newAppointmentRef.id;
    });

    return { id: appointmentId };
  } catch (error) {
    console.error('Falha na transação de criação de agendamento:', error);
    throw error;
  }
};

export const listProducerAppointmentsForWeek = async (
  producerId: string,
  referenceDate: Date,
): Promise<Appointment[]> => {
  const db = getFirebaseFirestore();

  const { weekStartsOn: start } = getWeekInfo(referenceDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);
  const q = query(
    appointmentsRef,
    where('producerId', '==', producerId),
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<', Timestamp.fromDate(end)),
  );

  const snapshot = await getDocs(q);

  const result: Appointment[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data() as {
      producerId: string;
      receiverId: string;
      state: ProducerState;
      cityId: string;
      date: Timestamp;
      volumeKg: number;
      status?: AppointmentStatus;
      clientRequestId?: string;
      receiverConfirmationStatus?: ReceiverConfirmationStatus;
      receiverConfirmationAt?: Timestamp | null;
      receiverConfirmationNotes?: string | null;
    };

    result.push({
      id: doc.id,
      producerId: data.producerId,
      receiverId: data.receiverId,
      state: data.state,
      cityId: data.cityId,
      date: data.date.toDate().toISOString().slice(0, 10),
      volumeKg: data.volumeKg,
      status: data.status ?? 'confirmed',
      clientRequestId: data.clientRequestId,
      receiverConfirmationStatus: data.receiverConfirmationStatus ?? 'pending',
      receiverConfirmationAt: data.receiverConfirmationAt
        ? data.receiverConfirmationAt.toDate().toISOString()
        : null,
      receiverConfirmationNotes: data.receiverConfirmationNotes ?? null,
    });
  });

  return result;
};

export const listReceiverUpcomingAppointments = async (
  receiverId: string,
  fromDate: Date,
): Promise<Appointment[]> => {
  const db = getFirebaseFirestore();

  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);

  const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);
  const q = query(
    appointmentsRef,
    where('receiverId', '==', receiverId),
    where('date', '>=', Timestamp.fromDate(start)),
  );

  const snapshot = await getDocs(q);

  const result: Appointment[] = [];

  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data() as {
      producerId: string;
      receiverId: string;
      state: ProducerState;
      cityId: string;
      date: Timestamp;
      volumeKg: number;
      status?: AppointmentStatus;
      clientRequestId?: string;
      receiverConfirmationStatus?: ReceiverConfirmationStatus;
      receiverConfirmationAt?: Timestamp | null;
      receiverConfirmationNotes?: string | null;
    };

    result.push({
      id: docSnapshot.id,
      producerId: data.producerId,
      receiverId: data.receiverId,
      state: data.state,
      cityId: data.cityId,
      date: data.date.toDate().toISOString().slice(0, 10),
      volumeKg: data.volumeKg,
      status: data.status ?? 'confirmed',
      clientRequestId: data.clientRequestId,
      receiverConfirmationStatus: data.receiverConfirmationStatus ?? 'pending',
      receiverConfirmationAt: data.receiverConfirmationAt
        ? data.receiverConfirmationAt.toDate().toISOString()
        : null,
      receiverConfirmationNotes: data.receiverConfirmationNotes ?? null,
    });
  });

  result.sort((a, b) => a.date.localeCompare(b.date));

  return result;
};

export const listReceiverAppointments = async (receiverId: string): Promise<Appointment[]> => {
  const db = getFirebaseFirestore();

  const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);
  const q = query(appointmentsRef, where('receiverId', '==', receiverId));

  const snapshot = await getDocs(q);

  const result: Appointment[] = [];

  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data() as {
      producerId: string;
      receiverId: string;
      state: ProducerState;
      cityId: string;
      date: Timestamp;
      volumeKg: number;
      status?: AppointmentStatus;
      clientRequestId?: string;
      receiverConfirmationStatus?: ReceiverConfirmationStatus;
      receiverConfirmationAt?: Timestamp | null;
      receiverConfirmationNotes?: string | null;
    };

    result.push({
      id: docSnapshot.id,
      producerId: data.producerId,
      receiverId: data.receiverId,
      state: data.state,
      cityId: data.cityId,
      date: data.date.toDate().toISOString().slice(0, 10),
      volumeKg: data.volumeKg,
      status: data.status ?? 'confirmed',
      clientRequestId: data.clientRequestId,
      receiverConfirmationStatus: data.receiverConfirmationStatus ?? 'pending',
      receiverConfirmationAt: data.receiverConfirmationAt
        ? data.receiverConfirmationAt.toDate().toISOString()
        : null,
      receiverConfirmationNotes: data.receiverConfirmationNotes ?? null,
    });
  });

  // Ordena do mais recente para o mais antigo pela data agendada (YYYY-MM-DD)
  result.sort((a, b) => b.date.localeCompare(a.date));

  return result;
};

export const listReceiverAppointmentsForDay = async (
  receiverId: string,
  day: Date,
): Promise<Appointment[]> => {
  const db = getFirebaseFirestore();

  const start = new Date(day);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);
  const q = query(
    appointmentsRef,
    where('receiverId', '==', receiverId),
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<', Timestamp.fromDate(end)),
  );

  const snapshot = await getDocs(q);

  const result: Appointment[] = [];

  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data() as {
      producerId: string;
      receiverId: string;
      state: ProducerState;
      cityId: string;
      date: Timestamp;
      volumeKg: number;
      status?: AppointmentStatus;
      clientRequestId?: string;
      receiverConfirmationStatus?: ReceiverConfirmationStatus;
      receiverConfirmationAt?: Timestamp | null;
      receiverConfirmationNotes?: string | null;
    };

    result.push({
      id: docSnapshot.id,
      producerId: data.producerId,
      receiverId: data.receiverId,
      state: data.state,
      cityId: data.cityId,
      date: data.date.toDate().toISOString().slice(0, 10),
      volumeKg: data.volumeKg,
      status: data.status ?? 'confirmed',
      clientRequestId: data.clientRequestId,
      receiverConfirmationStatus: data.receiverConfirmationStatus ?? 'pending',
      receiverConfirmationAt: data.receiverConfirmationAt
        ? data.receiverConfirmationAt.toDate().toISOString()
        : null,
      receiverConfirmationNotes: data.receiverConfirmationNotes ?? null,
    });
  });

  result.sort((a, b) => a.date.localeCompare(b.date));

  return result;
};

export type ReceiverConfirmationInput = {
  appointmentId: string;
  status: Exclude<ReceiverConfirmationStatus, 'pending'>;
  notes?: string;
};

export const updateReceiverAppointmentConfirmation = async (
  input: ReceiverConfirmationInput,
): Promise<void> => {
  const db = getFirebaseFirestore();

  const { appointmentId, status, notes } = input;

  const appointmentRef = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
  const snap = await getDoc(appointmentRef);

  if (!snap.exists()) {
    throw new Error('Agendamento não encontrado.');
  }

  const now = Timestamp.now();

  await updateDoc(appointmentRef, {
    receiverConfirmationStatus: status,
    receiverConfirmationAt: now,
    receiverConfirmationNotes: notes ?? null,
    updatedAt: now,
  });

  if (status === 'confirmed') {
    const appointment = snap.data() as Appointment;
    await updateStreak(appointment.producerId);
  }
};
