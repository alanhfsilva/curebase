import { z } from 'zod';

export class CursorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CursorError';
  }
}

const cursorPayloadSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.string().uuid(),
});

export function encodeCursor(createdAt: Date, id: string): string {
  const payload = JSON.stringify({
    createdAt: createdAt.toISOString(),
    id,
  });
  return Buffer.from(payload).toString('base64url');
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  let raw: string;
  try {
    raw = Buffer.from(cursor, 'base64url').toString('utf-8');
  } catch {
    throw new CursorError('Invalid cursor encoding');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CursorError('Invalid cursor format');
  }

  const result = cursorPayloadSchema.safeParse(parsed);
  if (!result.success) {
    throw new CursorError('Invalid cursor payload');
  }

  return {
    createdAt: new Date(result.data.createdAt),
    id: result.data.id,
  };
}
