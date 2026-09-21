import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { getDb } from './connection.js';
import { loadConfig } from '../config.js';

export async function runMigrations(databaseUrl: string) {
  const db = getDb(databaseUrl);
  await migrate(db, { migrationsFolder: './src/db/migrations' });
}

// Allow running this module directly (e.g. `tsx src/db/migrate.ts`) for
// local/CI migration runs, while still exporting runMigrations() for
// boot-time use from the API entrypoint.
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const config = loadConfig();
  runMigrations(config.databaseUrl)
    .then(() => {
      console.log('Migrations completed successfully');
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error('Migration failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
