import { z } from 'zod';

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Имя должно содержать минимум 2 символа')
    .max(100, 'Имя слишком длинное'),
  phone: z
    .string()
    .trim()
    .min(10, 'Укажите корректный телефон')
    .max(20, 'Телефон слишком длинный')
    .regex(/^[\d\s+()-]+$/, 'Телефон может содержать только цифры и +()- '),
  email: z.string().trim().email('Укажите корректный email'),
  comment: z
    .string()
    .trim()
    .min(10, 'Комментарий должен быть не короче 10 символов')
    .max(2000, 'Комментарий слишком длинный'),
});

export type ContactPayload = z.infer<typeof contactSchema>;
