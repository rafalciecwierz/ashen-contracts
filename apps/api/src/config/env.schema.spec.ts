import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.schema';

const validEnv = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://ashen:ashen@localhost:5432/ashen_contracts',
  JWT_SECRET: 'a'.repeat(32),
};

describe('validateEnv', () => {
  it('accepts a valid environment and applies defaults', () => {
    expect(validateEnv(validEnv)).toEqual({
      ...validEnv,
      PORT: 3001,
      CORS_ORIGIN: 'http://localhost:3000',
    });
  });

  it('coerces PORT from a string', () => {
    expect(validateEnv({ ...validEnv, PORT: '4000' }).PORT).toBe(4000);
  });

  it.each(['NODE_ENV', 'DATABASE_URL', 'JWT_SECRET'])(
    'rejects a missing %s and names it in the error',
    (name) => {
      const env: Record<string, unknown> = { ...validEnv };
      delete env[name];

      expect(() => validateEnv(env)).toThrow(name);
    },
  );

  it('rejects a mistyped NODE_ENV', () => {
    expect(() => validateEnv({ ...validEnv, NODE_ENV: 'prod' })).toThrow(
      'NODE_ENV',
    );
  });

  it('rejects a JWT_SECRET shorter than 32 characters', () => {
    expect(() => validateEnv({ ...validEnv, JWT_SECRET: 'short' })).toThrow(
      'JWT_SECRET',
    );
  });
});
