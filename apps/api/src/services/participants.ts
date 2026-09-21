import { and, gte, lte, desc, asc, sql, count } from 'drizzle-orm';
import { participants } from '../db/schema.js';
import { computeBmi } from './bmi.js';
import { encodeCursor, decodeCursor } from './cursor.js';
import type {
  CreateParticipantInput,
  ListParticipantsQuery,
  Participant,
  ListParticipantsResponse,
} from '@curebase/shared';

// Drizzle instance type is complex; validated by integration tests against real Postgres.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export class DuplicateEmailError extends Error {
  // `email` is accepted (not just a bare no-arg constructor) so call sites
  // read clearly at a glance, but it is deliberately NOT included in the
  // message: email is PHI and Error.message can end up logged or forwarded
  // to a client via a generic error handler.
  constructor(_email: string) {
    super('A participant with this email already exists');
    this.name = 'DuplicateEmailError';
  }
}

function isUniqueEmailViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes('unique') &&
    error.message.toLowerCase().includes('email')
  );
}

function toParticipant(row: typeof participants.$inferSelect): Participant {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    age: row.age,
    weight: Number(row.weight),
    height: Number(row.height),
    unitSystem: row.unitSystem as 'us' | 'metric',
    bmi: Number(row.bmi),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createParticipant(
  db: DrizzleDb,
  input: CreateParticipantInput,
): Promise<Participant> {
  const bmi = computeBmi(input.weight, input.height, input.unitSystem);

  try {
    const [row] = await db
      .insert(participants)
      .values({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        age: input.age,
        weight: String(input.weight),
        height: String(input.height),
        unitSystem: input.unitSystem,
        bmi: String(bmi),
      })
      .returning();

    return toParticipant(row);
  } catch (error: unknown) {
    if (isUniqueEmailViolation(error)) {
      throw new DuplicateEmailError(input.email);
    }
    throw error;
  }
}

function buildBmiFilterConditions(minBmi?: number, maxBmi?: number) {
  const conditions = [];
  if (minBmi !== undefined) {
    conditions.push(gte(participants.bmi, String(minBmi)));
  }
  if (maxBmi !== undefined) {
    conditions.push(lte(participants.bmi, String(maxBmi)));
  }
  return conditions;
}

export async function listParticipants(
  db: DrizzleDb,
  query: ListParticipantsQuery,
): Promise<ListParticipantsResponse> {
  const { limit, direction, cursor, minBmi, maxBmi } = query;
  const isForward = direction === 'next';

  const conditions = buildBmiFilterConditions(minBmi, maxBmi);

  const cursorData = cursor ? decodeCursor(cursor) : null;
  if (cursorData) {
    // The cursor's createdAt round-trips through a JS Date, which only holds
    // millisecond precision, while the `created_at` column stores microsecond
    // precision. Truncate the column to milliseconds for this comparison so
    // the boundary row (the one the cursor was minted from) isn't spuriously
    // included or excluded due to sub-millisecond drift.
    const truncatedCreatedAt = sql`date_trunc('millisecond', ${participants.createdAt})`;
    const cursorCreatedAt = cursorData.createdAt.toISOString();
    const cursorComparison = isForward
      ? sql`(${truncatedCreatedAt}, ${participants.id}) < (${cursorCreatedAt}, ${cursorData.id})`
      : sql`(${truncatedCreatedAt}, ${participants.id}) > (${cursorCreatedAt}, ${cursorData.id})`;
    conditions.push(cursorComparison);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(participants)
    .where(whereClause)
    .orderBy(
      isForward ? desc(participants.createdAt) : asc(participants.createdAt),
      isForward ? desc(participants.id) : asc(participants.id),
    )
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);

  if (!isForward) {
    pageRows.reverse();
  }

  const items = pageRows.map(toParticipant);

  const hasNextPage = isForward ? hasMore : Boolean(cursor);
  const hasPrevPage = isForward ? Boolean(cursor) : hasMore;

  const firstItem = pageRows[0];
  const lastItem = pageRows[pageRows.length - 1];

  const nextCursor =
    hasNextPage && lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null;
  const prevCursor =
    hasPrevPage && firstItem ? encodeCursor(firstItem.createdAt, firstItem.id) : null;

  const countWhereClause = (() => {
    const bmiFilterConditions = buildBmiFilterConditions(minBmi, maxBmi);
    return bmiFilterConditions.length > 0 ? and(...bmiFilterConditions) : undefined;
  })();

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(participants)
    .where(countWhereClause);

  return {
    items,
    pagination: {
      limit,
      nextCursor,
      prevCursor,
      hasNextPage,
      hasPrevPage,
    },
    total: Number(total),
  };
}
