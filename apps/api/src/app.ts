import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { participantRoutes } from './routes/participants.js';
import { getDb } from './db/connection.js';
import type { Config } from './config.js';

export async function buildApp(config: Config): Promise<FastifyInstance> {
  const app = Fastify({
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

  await app.register(cors, {
    origin: config.webOrigin,
  });

  const db = getDb(config.databaseUrl);

  app.decorate('db', db);

  await app.register(participantRoutes);

  return app;
}
