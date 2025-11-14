import { z } from 'zod';

import { PRODUCER_CITIES_BY_STATE, PRODUCER_CITIES_TUPLE, PRODUCER_STATES_TUPLE } from '@/config/producer-cities';

const toDigits = (value: string) => value.replace(/\D/g, '');

const CPF_OR_CNPJ_INPUT_REGEX =
  /^(\d{11}|\d{14}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/;

const coordinateSchema = ({ label, min, max }: { label: string; min: number; max: number }) =>
  z
    .union([z.string(), z.number()])
    .transform((value, ctx) => {
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} inválida.` });
          return z.NEVER;
        }

        if (value < min || value > max) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} deve estar entre ${min} e ${max}.` });
          return z.NEVER;
        }

        return value;
      }

      const trimmed = value.trim();
      if (!trimmed) {
        return undefined;
      }

      const normalized = Number(trimmed.replace(',', '.'));
      if (!Number.isFinite(normalized)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} inválida.` });
        return z.NEVER;
      }

      if (normalized < min || normalized > max) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} deve estar entre ${min} e ${max}.` });
        return z.NEVER;
      }

      return normalized;
    })
    .optional();

export const producerContactSchema = z.object({
  businessName: z.string().trim().min(1, 'Informe o nome fantasia ou razão social.'),
  document: z
    .string()
    .trim()
    .regex(CPF_OR_CNPJ_INPUT_REGEX, 'Informe um CPF ou CNPJ válido.')
    .transform((value, ctx) => {
      const digits = toDigits(value);
      if (![11, 14].includes(digits.length)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe CPF (11) ou CNPJ (14) apenas com números.' });
        return z.NEVER;
      }
      return digits;
    }),
  email: z.string().trim().email('E-mail inválido.'),
  phone: z
    .string()
    .trim()
    .transform((value, ctx) => {
      const digits = toDigits(value);
      if (digits.length < 10 || digits.length > 11) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe um telefone com DDD válido.' });
        return z.NEVER;
      }
      return digits;
    }),
});

export const producerAddressSchema = z.object({
  street: z.string().trim().min(1, 'Informe o logradouro.'),
  number: z.string().trim().min(1, 'Informe o número.'),
  neighborhood: z.string().trim().min(1, 'Informe o bairro.'),
  state: z.enum(PRODUCER_STATES_TUPLE, {
    errorMap: () => ({ message: 'Selecione um estado válido.' }),
  }),
  city: z.enum(PRODUCER_CITIES_TUPLE, {
    errorMap: () => ({ message: 'Selecione uma cidade válida.' }),
  }),
  postalCode: z
    .string()
    .trim()
    .transform((value, ctx) => {
      const digits = toDigits(value);
      if (digits.length !== 8) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CEP inválido. Use oito números.' });
        return z.NEVER;
      }
      return digits;
    }),
  latitude: coordinateSchema({ label: 'Latitude', min: -90, max: 90 }),
  longitude: coordinateSchema({ label: 'Longitude', min: -180, max: 180 }),
}).superRefine((data, ctx) => {
  const citiesForState = PRODUCER_CITIES_BY_STATE[data.state];
  if (citiesForState && !citiesForState.some(city => city === data.city)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Selecione uma cidade compatível com o estado escolhido.',
      path: ['city'],
    });
  }
});

export const producerCapacitySchema = z.object({
  averageDailyKg: z
    .union([z.number(), z.string()])
    .transform((value, ctx) => {
      const normalized =
        typeof value === 'number'
          ? value
          : Number(value.trim().replace(',', '.'));

      if (Number.isNaN(normalized)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe um volume médio diário válido.' });
        return z.NEVER;
      }

      if (normalized <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe um volume médio diário maior que zero.' });
        return z.NEVER;
      }

      return normalized;
    }),
});

export const producerRegistrationSchema = z.object({
  contact: producerContactSchema,
  address: producerAddressSchema,
  capacity: producerCapacitySchema,
});

export type ProducerContactData = z.infer<typeof producerContactSchema>;
export type ProducerAddressData = z.infer<typeof producerAddressSchema>;
export type ProducerCapacityData = z.infer<typeof producerCapacitySchema>;
export type ProducerRegistrationData = z.infer<typeof producerRegistrationSchema>;
