import { loadConfig } from './config.js';
import { buildApp } from './app.js';
import { runMigrations } from './db/migrate.js';

async function main(): Promise<void> {
  const config = loadConfig();

  await runMigrations(config.databaseUrl);

  const app = await buildApp(config);

  await app.listen({ port: config.apiPort, host: '0.0.0.0' });
}

main().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
