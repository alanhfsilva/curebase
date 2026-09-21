import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { participantRoutes } from './routes/participants.js';
import { getDb } from './db/connection.js';
import type { Config } from './config.js';

const BODY_LIMIT = 64 * 1024; // 64 KB — participant JSON is ~200 bytes

export async function buildApp(config: Config): Promise<FastifyInstance> {
  const app = Fastify({
    bodyLimit: BODY_LIMIT,
    logger: {
      level: 'info',
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
          };
        },
        res(reply) {
          return {
            statusCode: reply.statusCode,
          };
        },
        err(error) {
          return {
            type: error.constructor?.name ?? 'Error',
            message: error.message,
            code: error.code,
            stack: '',
          };
        },
      },
    },
  });

  await app.register(helmet);

  await app.register(cors, {
    origin: config.webOrigin,
  });

  await app.register(rateLimit, {
    max: 30,
    timeWindow: '1 minute',
    allowList: [],
  });

  const db = getDb(config.databaseUrl);

  app.decorate('db', db);

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(participantRoutes);

  return app;
}
