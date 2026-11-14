import { describe, expect, it } from 'vitest';
import { parseServerEnv } from './serverEnv';

const valid = {
  NODE_ENV: 'production',
  API_URL: 'https://api.example.com',
  BFF_SECRET: 'x'.repeat(32),
};

describe('parseServerEnv', () => {
  it('accepts a valid production environment', () => {
    expect(parseServerEnv(valid)).toEqual(valid);
  });

  it('lists every missing variable', () => {
    expect(() => parseServerEnv({})).toThrow(
      /NODE_ENV[\s\S]*API_URL[\s\S]*BFF_SECRET/,
    );
  });

  it('rejects a BFF_SECRET shorter than 32 characters', () => {
    expect(() =>
      parseServerEnv({ ...valid, BFF_SECRET: 'x'.repeat(31) }),
    ).toThrow(/BFF_SECRET/);
  });

  it.each(['not a url', 'ftp://api.example.com'])(
    'rejects API_URL %j',
    (API_URL) => {
      expect(() => parseServerEnv({ ...valid, API_URL })).toThrow(/API_URL/);
    },
  );

  it('rejects an http:// API_URL in production', () => {
    expect(() =>
      parseServerEnv({ ...valid, API_URL: 'http://api.example.com' }),
    ).toThrow(/https:\/\//);
  });

  it.each([
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://[::1]:3001',
  ])('accepts the loopback API_URL %s in production', (API_URL) => {
    expect(parseServerEnv({ ...valid, API_URL }).API_URL).toBe(API_URL);
  });

  it('accepts an http:// API_URL outside production', () => {
    expect(
      parseServerEnv({
        ...valid,
        NODE_ENV: 'development',
        API_URL: 'http://api.example.com',
      }).API_URL,
    ).toBe('http://api.example.com');
  });
});
