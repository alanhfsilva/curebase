import { z } from 'zod';

const phoneDigits = (raw: string) => raw.replace(/[\s-]/g, '');

const baseFields = {
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .transform(phoneDigits)
    .pipe(
      z
        .string()
        .regex(/^\d+$/, 'Phone must contain only digits')
        .min(10, 'Phone must have at least 10 digits')
        .max(15, 'Phone must have at most 15 digits'),
    ),
  age: z
    .number()
    .int('Age must be a whole number')
    .min(0, 'Age must be at least 0')
    .max(120, 'Age must be at most 120'),
};

export const createParticipantSchema = z
  .object({
    ...baseFields,
    weight: z.number().positive('Weight must be positive'),
    height: z.number().positive('Height must be positive'),
    unitSystem: z.enum(['us', 'metric']).default('us'),
  })
  .superRefine((data, ctx) => {
    if (data.unitSystem === 'us') {
      if (data.weight < 50 || data.weight > 700) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Weight must be 50–700 lbs',
          path: ['weight'],
        });
      }
      if (data.height < 20 || data.height > 90) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Height must be 20–90 inches',
          path: ['height'],
        });
      }
    } else {
      if (data.weight < 20 || data.weight > 320) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Weight must be 20–320 kg',
          path: ['weight'],
        });
      }
      if (data.height < 50 || data.height > 230) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Height must be 50–230 cm',
          path: ['height'],
        });
      }
    }
  });

export type CreateParticipantInput = z.infer<typeof createParticipantSchema>;
