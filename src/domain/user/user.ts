export type UserProfileType = 'producer' | 'receiver';

export type ProducerProfile = {
  name: string;
  photoUrl?: string;
  averageDailyWasteKg: number;
  cityId: string;
  sendingDays?: Weekday[];
  sendingWindow?: {
    [day in Weekday]?: { start: string; end: string }[];
  };
  // Campos adicionados
  streakCount?: number;
  lastStreakUpdate?: string; // Formato YYYY-MM-DD
  sustainabilitySealCode?: string;
};

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type ReceiverProfile = {
  name: string;
  weeklyCapacityKg: number;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    state: string;
    cityId: string;
    postalCode?: string;
  };
  receivingDays: Weekday[];
  receivingWindow: {
    [day in Weekday]?: { start: string; end: string }[];
  };
};

export type User = {
  id: string;
  email: string;
  profileType?: UserProfileType;
  producerProfile?: ProducerProfile;
  receiverProfile?: ReceiverProfile;
  createdAt: Date;
  updatedAt: Date;
};
