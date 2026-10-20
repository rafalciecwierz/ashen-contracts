import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from './auth.schema.js';

describe.each([
  ['registerSchema', registerSchema],
  ['loginSchema', loginSchema],
])('%s', (_name, schema) => {
  it('trims and lowercases the email', () => {
    const result = schema.safeParse({
      email: '  Test@X.com ',
      password: 'password123',
    });

    expect(result.data?.email).toBe('test@x.com');
  });

  it.each(['not-an-email', '', 42, undefined])(
    'rejects the email %j',
    (email) => {
      const result = schema.safeParse({ email, password: 'password123' });

      expect(result.error?.issues.map((issue) => issue.path)).toEqual([
        ['email'],
      ]);
    },
  );

  it('rejects a field it does not declare', () => {
    const result = schema.safeParse({
      email: 'test@x.com',
      password: 'password123',
      isAdmin: true,
    });

    expect(result.error?.issues).toMatchObject([
      { code: 'unrecognized_keys', keys: ['isAdmin'] },
    ]);
  });
});

describe('registerSchema', () => {
  it('requires at least 8 characters of password', () => {
    expect(
      registerSchema.safeParse({ email: 'a@b.co', password: '1234567' })
        .success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ email: 'a@b.co', password: '12345678' })
        .success,
    ).toBe(true);
  });
});

describe('loginSchema', () => {
  it('accepts any non-empty password, however short', () => {
    expect(
      loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success,
    ).toBe(true);
  });

  it('rejects an empty password', () => {
    expect(
      loginSchema.safeParse({ email: 'a@b.co', password: '' }).success,
    ).toBe(false);
  });
});
