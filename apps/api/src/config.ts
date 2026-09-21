import { z } from 'zod';

const configSchema = z.object({
  databaseUrl: z.string().url(),
  apiPort: z.coerce.number().int().default(3001),
  webOrigin: z.string().url().default('http://localhost:5173'),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  return configSchema.parse({
    databaseUrl: process.env.DATABASE_URL,
    apiPort: process.env.API_PORT,
    webOrigin: process.env.WEB_ORIGIN,
  });
}
