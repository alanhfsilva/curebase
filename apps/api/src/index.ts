import { loadConfig } from './config.js';
import { buildApp } from './app.js';
import { runMigrations } from './db/migrate.js';
import { closeDb } from './db/connection.js';

async function main(): Promise<void> {
  const config = loadConfig();

  await runMigrations(config.databaseUrl);

  const app = await buildApp(config);

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Shutting down');
    await app.close();
    await closeDb();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  await app.listen({ port: config.apiPort, host: '0.0.0.0' });
}

main().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
