import type { Timestamp } from 'firebase/firestore';

export type WeeklyCapacity = {
  receiverId: string;
  year: number;
  weekNumber: number;
  weekStartsOn: Timestamp;
  baseCapacityKg: number;
  bookedKg: number;
  appointmentIds: string[];
};
