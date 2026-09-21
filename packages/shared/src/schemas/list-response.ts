import { z } from 'zod';

export const participantSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  age: z.number().int(),
  weight: z.number(),
  height: z.number(),
  unitSystem: z.enum(['us', 'metric']),
  bmi: z.number(),
  createdAt: z.string().datetime(),
});

export type Participant = z.infer<typeof participantSchema>;

export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100),
  nextCursor: z.string().nullable(),
  prevCursor: z.string().nullable(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export type Pagination = z.infer<typeof paginationSchema>;

export const listParticipantsResponseSchema = z.object({
  items: z.array(participantSchema),
  pagination: paginationSchema,
  total: z.number().int().min(0),
});

export type ListParticipantsResponse = z.infer<typeof listParticipantsResponseSchema>;
