import type { FastifyPluginAsync } from 'fastify';
import { createParticipantSchema, listParticipantsQuerySchema } from '@curebase/shared';
import {
  createParticipant,
  listParticipants,
  DuplicateEmailError,
} from '../services/participants.js';
import { CursorError } from '../services/cursor.js';

export const participantRoutes: FastifyPluginAsync = async (app) => {
  app.post('/participants', async (request, reply) => {
    const parsed = createParticipantSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const participant = await createParticipant(app.db, parsed.data);
      return reply.status(201).send(participant);
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        return reply.status(409).send({
          error: 'Conflict',
          details: { email: ['A participant with this email already exists'] },
        });
      }
      request.log.error({ err: error }, 'Failed to create participant');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  app.get('/participants', async (request, reply) => {
    const parsed = listParticipantsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const result = await listParticipants(app.db, parsed.data);
      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof CursorError) {
        return reply.status(400).send({
          error: 'Invalid cursor',
          details: { cursor: [error.message] },
        });
      }
      request.log.error({ err: error }, 'Failed to list participants');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};
