import type { ProducerState } from '@/config/producer-cities';

export type CityId = string;

export interface City {
  id: CityId;
  name: string;
  state: ProducerState;
}
