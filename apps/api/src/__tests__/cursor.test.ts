import { describe, it, expect } from 'vitest';
import { encodeCursor, decodeCursor, CursorError } from '../services/cursor.js';

describe('cursor', () => {
  const createdAt = new Date('2025-08-24T19:16:40.000Z');
  const id = '2f1b6e3a-7c4d-4a8e-9b21-0c8d5e1a4f70';

  it('encodes and decodes a cursor round-trip', () => {
    const encoded = encodeCursor(createdAt, id);
    const decoded = decodeCursor(encoded);
    expect(decoded.createdAt.toISOString()).toBe(createdAt.toISOString());
    expect(decoded.id).toBe(id);
  });

  it('produces a URL-safe base64 string', () => {
    const encoded = encodeCursor(createdAt, id);
    expect(encoded).toMatch(/^[A-Za-z0-9_\-]+=*$/);
  });

  it('throws CursorError on invalid base64', () => {
    expect(() => decodeCursor('!!!not-base64!!!')).toThrow(CursorError);
  });

  it('throws CursorError on valid base64 but invalid JSON', () => {
    const encoded = Buffer.from('not json').toString('base64url');
    expect(() => decodeCursor(encoded)).toThrow(CursorError);
  });

  it('throws CursorError when createdAt is missing', () => {
    const encoded = Buffer.from(JSON.stringify({ id })).toString('base64url');
    expect(() => decodeCursor(encoded)).toThrow(CursorError);
  });

  it('throws CursorError when id is missing', () => {
    const encoded = Buffer.from(
      JSON.stringify({ createdAt: createdAt.toISOString() }),
    ).toString('base64url');
    expect(() => decodeCursor(encoded)).toThrow(CursorError);
  });
});
