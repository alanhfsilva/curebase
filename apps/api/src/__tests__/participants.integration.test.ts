import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  setupTestDb,
  getTestDb,
  cleanParticipants,
  teardownTestDb,
} from './setup.js';
import {
  createParticipant,
  listParticipants,
  DuplicateEmailError,
} from '../services/participants.js';

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await cleanParticipants();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('createParticipant', () => {
  it('persists a US participant with computed BMI', async () => {
    const db = getTestDb();
    const result = await createParticipant(db, {
      firstName: 'Peter',
      lastName: 'Pan',
      email: 'peter@example.com',
      phone: '1234567890',
      age: 14,
      weight: 85,
      height: 54,
      unitSystem: 'us',
    });

    expect(result.id).toBeDefined();
    expect(result.firstName).toBe('Peter');
    expect(result.bmi).toBeCloseTo(20.49, 1);
    expect(result.unitSystem).toBe('us');
    expect(result.createdAt).toBeDefined();
  });

  it('persists a metric participant with computed BMI', async () => {
    const db = getTestDb();
    const result = await createParticipant(db, {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '9876543210',
      age: 30,
      weight: 70,
      height: 170,
      unitSystem: 'metric',
    });

    expect(result.bmi).toBeCloseTo(24.22, 1);
    expect(result.unitSystem).toBe('metric');
  });

  it('throws DuplicateEmailError on duplicate email', async () => {
    const db = getTestDb();
    const input = {
      firstName: 'Peter',
      lastName: 'Pan',
      email: 'peter@example.com',
      phone: '1234567890',
      age: 14,
      weight: 85,
      height: 54,
      unitSystem: 'us' as const,
    };

    await createParticipant(db, input);
    await expect(createParticipant(db, { ...input, firstName: 'Different' })).rejects.toThrow(
      DuplicateEmailError,
    );
  });

  it('treats email case-insensitively', async () => {
    const db = getTestDb();
    const input = {
      firstName: 'Peter',
      lastName: 'Pan',
      email: 'Peter@Example.com',
      phone: '1234567890',
      age: 14,
      weight: 85,
      height: 54,
      unitSystem: 'us' as const,
    };

    await createParticipant(db, input);
    await expect(
      createParticipant(db, { ...input, email: 'peter@example.com' }),
    ).rejects.toThrow(DuplicateEmailError);
  });
});

describe('listParticipants', () => {
  it('returns empty list when no participants exist', async () => {
    const db = getTestDb();
    const result = await listParticipants(db, { limit: 10, direction: 'next' });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.pagination.hasNextPage).toBe(false);
    expect(result.pagination.hasPrevPage).toBe(false);
  });

  it('returns participants sorted by createdAt desc', async () => {
    const db = getTestDb();
    await createParticipant(db, {
      firstName: 'First',
      lastName: 'User',
      email: 'first@example.com',
      phone: '1234567890',
      age: 20,
      weight: 150,
      height: 65,
      unitSystem: 'us',
    });
    await createParticipant(db, {
      firstName: 'Second',
      lastName: 'User',
      email: 'second@example.com',
      phone: '1234567891',
      age: 25,
      weight: 160,
      height: 70,
      unitSystem: 'us',
    });

    const result = await listParticipants(db, { limit: 10, direction: 'next' });

    expect(result.items).toHaveLength(2);
    expect(result.items[0].firstName).toBe('Second');
    expect(result.items[1].firstName).toBe('First');
  });

  it('filters by minBmi', async () => {
    const db = getTestDb();
    await createParticipant(db, {
      firstName: 'Low',
      lastName: 'Bmi',
      email: 'low@example.com',
      phone: '1234567890',
      age: 20,
      weight: 100,
      height: 80,
      unitSystem: 'us',
    });
    await createParticipant(db, {
      firstName: 'High',
      lastName: 'Bmi',
      email: 'high@example.com',
      phone: '1234567891',
      age: 20,
      weight: 300,
      height: 65,
      unitSystem: 'us',
    });

    const lowBmi = (await listParticipants(db, { limit: 10, direction: 'next' })).items;
    const highBmiValue = lowBmi.reduce((max, p) => Math.max(max, p.bmi), 0);

    const result = await listParticipants(db, {
      limit: 10,
      direction: 'next',
      minBmi: highBmiValue,
    });

    expect(result.items.every((p) => p.bmi >= highBmiValue)).toBe(true);
  });

  it('paginates forward with keyset cursor', async () => {
    const db = getTestDb();
    for (let i = 0; i < 5; i++) {
      await createParticipant(db, {
        firstName: `User${i}`,
        lastName: 'Test',
        email: `user${i}@example.com`,
        phone: '1234567890',
        age: 20 + i,
        weight: 150,
        height: 65,
        unitSystem: 'us',
      });
    }

    const page1 = await listParticipants(db, { limit: 2, direction: 'next' });
    expect(page1.items).toHaveLength(2);
    expect(page1.pagination.hasNextPage).toBe(true);
    expect(page1.pagination.nextCursor).not.toBeNull();

    const page2 = await listParticipants(db, {
      limit: 2,
      direction: 'next',
      cursor: page1.pagination.nextCursor!,
    });
    expect(page2.items).toHaveLength(2);

    const page1Ids = page1.items.map((p) => p.id);
    const page2Ids = page2.items.map((p) => p.id);
    expect(page1Ids).not.toEqual(expect.arrayContaining(page2Ids));
  });

  it('paginates backward', async () => {
    const db = getTestDb();
    for (let i = 0; i < 5; i++) {
      await createParticipant(db, {
        firstName: `User${i}`,
        lastName: 'Test',
        email: `user${i}@example.com`,
        phone: '1234567890',
        age: 20 + i,
        weight: 150,
        height: 65,
        unitSystem: 'us',
      });
    }

    const page1 = await listParticipants(db, { limit: 2, direction: 'next' });
    const page2 = await listParticipants(db, {
      limit: 2,
      direction: 'next',
      cursor: page1.pagination.nextCursor!,
    });

    expect(page2.pagination.hasPrevPage).toBe(true);
    expect(page2.pagination.prevCursor).not.toBeNull();

    const backToPage1 = await listParticipants(db, {
      limit: 2,
      direction: 'prev',
      cursor: page2.pagination.prevCursor!,
    });

    expect(backToPage1.items.map((p) => p.id)).toEqual(page1.items.map((p) => p.id));
  });

  it('returns correct total with BMI filter', async () => {
    const db = getTestDb();
    await createParticipant(db, {
      firstName: 'A',
      lastName: 'User',
      email: 'a@example.com',
      phone: '1234567890',
      age: 20,
      weight: 150,
      height: 65,
      unitSystem: 'us',
    });
    await createParticipant(db, {
      firstName: 'B',
      lastName: 'User',
      email: 'b@example.com',
      phone: '1234567891',
      age: 25,
      weight: 300,
      height: 65,
      unitSystem: 'us',
    });

    const all = await listParticipants(db, { limit: 10, direction: 'next' });
    expect(all.total).toBe(2);

    const filtered = await listParticipants(db, {
      limit: 10,
      direction: 'next',
      minBmi: 40,
    });
    expect(filtered.total).toBeLessThan(all.total);
  });
});
