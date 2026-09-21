import { z } from 'zod';

export const listParticipantsQuerySchema = z
  .object({
    minBmi: z.coerce.number().optional(),
    maxBmi: z.coerce.number().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    cursor: z.string().min(1).optional(),
    direction: z.enum(['next', 'prev']).default('next'),
  })
  .refine(
    (data) => {
      if (data.direction === 'prev' && !data.cursor) return false;
      return true;
    },
    { message: 'cursor is required when direction is prev', path: ['cursor'] },
  )
  .refine(
    (data) => {
      if (data.minBmi !== undefined && data.maxBmi !== undefined) {
        return data.minBmi <= data.maxBmi;
      }
      return true;
    },
    { message: 'minBmi must be less than or equal to maxBmi', path: ['minBmi'] },
  );

export type ListParticipantsQuery = z.infer<typeof listParticipantsQuerySchema>;
