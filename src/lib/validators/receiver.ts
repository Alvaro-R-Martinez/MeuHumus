import { z } from 'zod';

export const receiverWeekDayEnum = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

export const receiverBasicsSchema = z.object({
  businessName: z.string().min(1, 'Informe o nome comercial.'),
  compostingType: z.string().min(1, 'Informe o tipo de compostagem.'),
});

export const receiverContactSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  phone: z.string().min(10, 'Informe um telefone para contato.'),
});

export const receiverAddressSchema = z.object({
  street: z.string().min(1, 'Informe o logradouro.'),
  number: z.string().min(1, 'Informe o número.'),
  neighborhood: z.string().min(1, 'Informe o bairro.'),
  city: z.string().min(1, 'Informe a cidade.'),
  state: z.string().min(2, 'Informe o estado.'),
  postalCode: z.string().min(8, 'CEP inválido.'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const receiverCoverageSchema = z.object({
  address: receiverAddressSchema,
  serviceRadiusKm: z.number().positive('Informe um raio de atendimento válido.'),
});

const capacityDaySchema = z
  .number()
  .min(0, 'Informe 0 para dias sem recebimento ou um valor positivo.')
  .max(9999, 'Valor muito alto.');

export const receiverCapacitySchema = z
  .object({
    byDayKg: z.object({
      mon: capacityDaySchema,
      tue: capacityDaySchema,
      wed: capacityDaySchema,
      thu: capacityDaySchema,
      fri: capacityDaySchema,
      sat: capacityDaySchema,
      sun: capacityDaySchema,
    }),
  })
  .refine((data) => Object.values(data.byDayKg).some((value) => value > 0), {
    message: 'Informe capacidade para ao menos um dia da semana.',
    path: ['byDayKg'],
  });

export const acceptedResidueOptions = [
  'Resíduos vegetais crus',
  'Resíduos vegetais cozidos',
  'Cascas e aparas de frutas',
  'Borra de café e chás',
  'Folhas secas e podas leves',
  'Serragem limpa',
  'Outros resíduos orgânicos puros',
] as const;

export const receiverMaterialsSchema = z.object({
  acceptedTypes: z
    .array(z.enum(acceptedResidueOptions))
    .min(1, 'Selecione ao menos um tipo de resíduo aceito.'),
  notes: z
    .string()
    .trim()
    .max(280, 'Descreva em até 280 caracteres.')
    .optional()
    .or(z.literal('')),
});

export const receiverReceivingWindowSchema = z
  .object({
    start: z.string().min(1, 'Informe o horário inicial.'),
    end: z.string().min(1, 'Informe o horário final.'),
  })
  .refine((data) => data.end > data.start, {
    message: 'Horário final deve ser posterior ao inicial.',
    path: ['end'],
  });

export const receiverRegistrationSchema = z.object({
  basics: receiverBasicsSchema,
  contact: receiverContactSchema,
  coverage: receiverCoverageSchema,
  capacity: receiverCapacitySchema,
  materials: receiverMaterialsSchema,
  receivingWindow: receiverReceivingWindowSchema,
});

export type ReceiverBasicsData = z.infer<typeof receiverBasicsSchema>;
export type ReceiverContactData = z.infer<typeof receiverContactSchema>;
export type ReceiverAddressData = z.infer<typeof receiverAddressSchema>;
export type ReceiverCoverageData = z.infer<typeof receiverCoverageSchema>;
export type ReceiverCapacityData = z.infer<typeof receiverCapacitySchema>;
export type ReceiverMaterialsData = z.infer<typeof receiverMaterialsSchema>;
export type ReceiverReceivingWindowData = z.infer<typeof receiverReceivingWindowSchema>;
export type ReceiverRegistrationData = z.infer<typeof receiverRegistrationSchema>;
