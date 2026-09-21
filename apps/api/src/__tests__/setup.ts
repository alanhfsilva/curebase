import { getDb, closeDb } from '../db/connection.js';
import { runMigrations } from '../db/migrate.js';
import { participants } from '../db/schema.js';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://curebase:curebase@localhost:5432/curebase_test';

export function getTestDb() {
  return getDb(TEST_DATABASE_URL);
}

export async function setupTestDb() {
  await runMigrations(TEST_DATABASE_URL);
}

export async function cleanParticipants() {
  const db = getTestDb();
  await db.delete(participants);
}

export async function teardownTestDb() {
  await closeDb();
}
