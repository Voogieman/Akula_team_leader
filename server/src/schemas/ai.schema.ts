import { z } from 'zod';

export const aiSummarySchema = z.object({
  topic: z
    .string()
    .trim()
    .min(3, 'Тема должна быть не короче 3 символов')
    .max(200, 'Тема слишком длинная'),
});

export type AiSummaryPayload = z.infer<typeof aiSummarySchema>;
