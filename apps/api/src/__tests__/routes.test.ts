import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import { setupTestDb, cleanParticipants, teardownTestDb } from './setup.js';
import type { FastifyInstance } from 'fastify';
import type { Participant } from '@curebase/shared';

const TEST_CONFIG = {
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://curebase:curebase@localhost:5432/curebase',
  apiPort: 0,
  webOrigin: 'http://localhost:5173',
};

let app: FastifyInstance;

beforeAll(async () => {
  await setupTestDb();
  app = await buildApp(TEST_CONFIG);
});

beforeEach(async () => {
  await cleanParticipants();
});

afterAll(async () => {
  await app.close();
  await teardownTestDb();
});

describe('POST /participants', () => {
  it('returns 201 with computed BMI', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/participants',
      payload: {
        firstName: 'Peter',
        lastName: 'Pan',
        email: 'peter@example.com',
        phone: '1234567890',
        age: 14,
        weight: 85,
        height: 54,
        unitSystem: 'us',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBeDefined();
    expect(body.bmi).toBeDefined();
    expect(body.bmi).toBeCloseTo(20.49, 1);
  });

  it('returns 400 on invalid input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/participants',
      payload: {
        firstName: '',
        lastName: 'Pan',
        email: 'not-an-email',
        phone: '123',
        age: 200,
        weight: 85,
        height: 54,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.details).toBeDefined();
  });

  it('returns 409 on duplicate email', async () => {
    const payload = {
      firstName: 'Peter',
      lastName: 'Pan',
      email: 'peter@example.com',
      phone: '1234567890',
      age: 14,
      weight: 85,
      height: 54,
      unitSystem: 'us',
    };

    await app.inject({ method: 'POST', url: '/participants', payload });
    const response = await app.inject({ method: 'POST', url: '/participants', payload });

    expect(response.statusCode).toBe(409);
  });
});

describe('GET /participants', () => {
  it('returns 200 with empty list', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/participants',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.items).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it('returns 400 on invalid limit', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/participants?limit=0',
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 on invalid cursor', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/participants?cursor=invalid!!!',
    });

    expect(response.statusCode).toBe(400);
  });

  it('filters by BMI range', async () => {
    await app.inject({
      method: 'POST',
      url: '/participants',
      payload: {
        firstName: 'Low',
        lastName: 'Bmi',
        email: 'low@example.com',
        phone: '1234567890',
        age: 20,
        weight: 100,
        height: 80,
        unitSystem: 'us',
      },
    });
    await app.inject({
      method: 'POST',
      url: '/participants',
      payload: {
        firstName: 'High',
        lastName: 'Bmi',
        email: 'high@example.com',
        phone: '1234567891',
        age: 20,
        weight: 300,
        height: 50,
        unitSystem: 'us',
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/participants?minBmi=50',
    });

    const body = response.json() as { items: Participant[] };
    expect(body.items.every((p) => p.bmi >= 50)).toBe(true);
  });

  it('paginates with keyset cursor', async () => {
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST',
        url: '/participants',
        payload: {
          firstName: `User${i}`,
          lastName: 'Test',
          email: `user${i}@example.com`,
          phone: '1234567890',
          age: 20 + i,
          weight: 150,
          height: 65,
          unitSystem: 'us',
        },
      });
    }

    const page1 = await app.inject({
      method: 'GET',
      url: '/participants?limit=2',
    });
    const body1 = page1.json();
    expect(body1.items).toHaveLength(2);
    expect(body1.pagination.hasNextPage).toBe(true);

    const page2 = await app.inject({
      method: 'GET',
      url: `/participants?limit=2&cursor=${body1.pagination.nextCursor}`,
    });
    const body2 = page2.json();
    expect(body2.items).toHaveLength(2);

    const ids1 = body1.items.map((p: Participant) => p.id);
    const ids2 = body2.items.map((p: Participant) => p.id);
    expect(ids1).not.toEqual(expect.arrayContaining(ids2));
  });
});
