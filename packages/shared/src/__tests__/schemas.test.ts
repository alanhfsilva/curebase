import { describe, it, expect } from 'vitest';
import {
  createParticipantSchema,
  listParticipantsQuerySchema,
  participantSchema,
} from '../index.js';

describe('createParticipantSchema', () => {
  it('accepts a valid US participant', () => {
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
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts a valid metric participant', () => {
    const input = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '9876543210',
      age: 30,
      weight: 70,
      height: 170,
      unitSystem: 'metric' as const,
    };
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('defaults unitSystem to us', () => {
    const input = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '1234567890',
      age: 25,
      weight: 150,
      height: 65,
    };
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unitSystem).toBe('us');
    }
  });

  it('rejects empty firstName', () => {
    const input = {
      firstName: '',
      lastName: 'Pan',
      email: 'peter@example.com',
      phone: '1234567890',
      age: 14,
      weight: 85,
      height: 54,
    };
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const input = {
      firstName: 'Peter',
      lastName: 'Pan',
      email: 'not-an-email',
      phone: '1234567890',
      age: 14,
      weight: 85,
      height: 54,
    };
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects age above 120', () => {
    const input = {
      firstName: 'Peter',
      lastName: 'Pan',
      email: 'peter@example.com',
      phone: '1234567890',
      age: 121,
      weight: 85,
      height: 54,
    };
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects phone with fewer than 10 digits', () => {
    const input = {
      firstName: 'Peter',
      lastName: 'Pan',
      email: 'peter@example.com',
      phone: '12345',
      age: 14,
      weight: 85,
      height: 54,
    };
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('accepts phone with dashes and spaces (stripped to digits)', () => {
    const input = {
      firstName: 'Peter',
      lastName: 'Pan',
      email: 'peter@example.com',
      phone: '123-456-7890',
      age: 14,
      weight: 85,
      height: 54,
    };
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects US weight below 50 lb', () => {
    const input = {
      firstName: 'Peter',
      lastName: 'Pan',
      email: 'peter@example.com',
      phone: '1234567890',
      age: 14,
      weight: 10,
      height: 54,
      unitSystem: 'us' as const,
    };
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects metric height below 50 cm', () => {
    const input = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '9876543210',
      age: 30,
      weight: 70,
      height: 30,
      unitSystem: 'metric' as const,
    };
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('trims firstName and lastName', () => {
    const input = {
      firstName: '  Peter  ',
      lastName: '  Pan  ',
      email: 'peter@example.com',
      phone: '1234567890',
      age: 14,
      weight: 85,
      height: 54,
    };
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe('Peter');
      expect(result.data.lastName).toBe('Pan');
    }
  });
});

describe('listParticipantsQuerySchema', () => {
  it('accepts empty query (all defaults)', () => {
    const result = listParticipantsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
      expect(result.data.direction).toBe('next');
    }
  });

  it('accepts minBmi and maxBmi', () => {
    const result = listParticipantsQuerySchema.safeParse({
      minBmi: 18.5,
      maxBmi: 25.0,
    });
    expect(result.success).toBe(true);
  });

  it('rejects limit below 1', () => {
    const result = listParticipantsQuerySchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects limit above 100', () => {
    const result = listParticipantsQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects direction=prev without cursor', () => {
    const result = listParticipantsQuerySchema.safeParse({
      direction: 'prev',
    });
    expect(result.success).toBe(false);
  });

  it('accepts direction=prev with cursor', () => {
    const result = listParticipantsQuerySchema.safeParse({
      direction: 'prev',
      cursor: 'abc123',
    });
    expect(result.success).toBe(true);
  });
});

describe('participantSchema', () => {
  it('accepts a full participant object', () => {
    const participant = {
      id: '2f1b6e3a-7c4d-4a8e-9b21-0c8d5e1a4f70',
      firstName: 'Peter',
      lastName: 'Pan',
      email: 'peter@example.com',
      phone: '1234567890',
      age: 14,
      weight: 85,
      height: 54,
      unitSystem: 'us',
      bmi: 20.5,
      createdAt: '2025-08-24T19:16:40.000Z',
    };
    const result = participantSchema.safeParse(participant);
    expect(result.success).toBe(true);
  });
});
