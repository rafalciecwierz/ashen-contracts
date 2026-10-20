import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { validationException } from './validationException';

function issuesOf(schema: z.ZodType, value: unknown) {
  const result = schema.safeParse(value);
  if (result.success) throw new Error('expected the value to be invalid');
  return result.error.issues;
}

describe('validationException', () => {
  it('returns a 400 with VALIDATION_FAILED and one detail per violated rule', () => {
    const schema = z.strictObject({
      email: z.email(),
      password: z.string().min(8),
    });

    const exception = validationException(
      issuesOf(schema, { email: 'x', password: 'short' }),
    );

    expect(exception.getStatus()).toBe(400);
    expect(exception.getResponse()).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Validation failed',
      details: [
        {
          field: 'email',
          constraint: 'invalid_format',
          message: 'Invalid email address',
        },
        {
          field: 'password',
          constraint: 'too_small',
          message: 'Too small: expected string to have >=8 characters',
        },
      ],
    });
  });

  it('gives every unknown key its own detail', () => {
    const schema = z.strictObject({ email: z.string() });

    const response = validationException(
      issuesOf(schema, { email: 'a@b.co', isAdmin: true, role: 'admin' }),
    ).getResponse();

    expect(response).toMatchObject({
      details: [
        {
          field: 'isAdmin',
          constraint: 'unrecognized_keys',
          message: 'Unrecognized key: "isAdmin"',
        },
        {
          field: 'role',
          constraint: 'unrecognized_keys',
          message: 'Unrecognized key: "role"',
        },
      ],
    });
  });

  it('gives nested fields a dotted path', () => {
    const schema = z.object({ address: z.object({ city: z.string().min(1) }) });

    const response = validationException(
      issuesOf(schema, { address: { city: '' } }),
    ).getResponse();

    expect(response).toMatchObject({
      details: [{ field: 'address.city', constraint: 'too_small' }],
    });
  });

  it('uses an empty field for the body itself', () => {
    const response = validationException(
      issuesOf(z.object({}), []),
    ).getResponse();

    expect(response).toMatchObject({
      details: [{ field: '', constraint: 'invalid_type' }],
    });
  });

  it('falls back to "invalid" for an issue without a code', () => {
    const response = validationException([
      { message: 'Not valid', path: ['name'] },
    ]).getResponse();

    expect(response).toMatchObject({
      details: [{ field: 'name', constraint: 'invalid', message: 'Not valid' }],
    });
  });
});
