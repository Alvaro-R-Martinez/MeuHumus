import { useEffect, useState } from 'react';

import { PRODUCER_CITIES_BY_STATE, type ProducerCity, type ProducerState } from '@/config/producer-cities';

let cachedCities: { state: ProducerState; city: ProducerCity }[] | null = null;

export type CityOption = {
  id: string;
  state: ProducerState;
  name: ProducerCity;
};

export const buildCityOptions = (): CityOption[] => {
  if (cachedCities) {
    return cachedCities.map((item) => ({
      id: `${item.state}-${item.city}`,
      state: item.state,
      name: item.city,
    }));
  }

  const result: { state: ProducerState; city: ProducerCity }[] = [];

  (Object.keys(PRODUCER_CITIES_BY_STATE) as ProducerState[]).forEach((state) => {
    PRODUCER_CITIES_BY_STATE[state].forEach((city) => {
      result.push({ state, city });
    });
  });

  cachedCities = result;

  return result.map((item) => ({
    id: `${item.state}-${item.city}`,
    state: item.state,
    name: item.city,
  }));
};

export const useCities = () => {
  const [cities, setCities] = useState<CityOption[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const options = buildCityOptions();
      setCities(options);
    } catch (err) {
      console.error('[useCities] Failed to load cities', err);
      setError('Não foi possível carregar a lista de cidades.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { cities, loading, error };
};
