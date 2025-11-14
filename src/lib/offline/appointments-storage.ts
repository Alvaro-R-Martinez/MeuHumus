import type { Appointment } from '@/services/firestore/appointments-client';

const STORAGE_KEY = 'mh_producer_appointments';

export type StoredAppointment = Appointment;

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

export const loadStoredAppointments = (): StoredAppointment[] => {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredAppointment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveStoredAppointments = (appointments: StoredAppointment[]) => {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
  } catch {
    // ignore
  }
};

export const upsertStoredAppointment = (appointment: StoredAppointment) => {
  const current = loadStoredAppointments();
  const existingIndex = current.findIndex((item) => item.id === appointment.id);

  if (existingIndex >= 0) {
    current[existingIndex] = appointment;
  } else {
    current.push(appointment);
  }

  saveStoredAppointments(current);
};

export const removeStoredAppointment = (id: string) => {
  const current = loadStoredAppointments();
  const next = current.filter((item) => item.id !== id);
  saveStoredAppointments(next);
};
