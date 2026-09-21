import type { DrizzleDb } from '../db/connection.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: DrizzleDb;
  }
}
