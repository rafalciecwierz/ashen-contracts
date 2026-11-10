import { describe, expect, it } from 'vitest';
import { API_ERROR_CODES, isApiErrorCode } from './errors.js';

describe('isApiErrorCode', () => {
  it.each(API_ERROR_CODES)('accepts %s', (code) => {
    expect(isApiErrorCode(code)).toBe(true);
  });

  it.each([
    'SOME_FUTURE_CODE',
    'invalid_credentials',
    '',
    undefined,
    null,
    42,
    { code: 'NOT_FOUND' },
  ])('rejects %j', (value) => {
    expect(isApiErrorCode(value)).toBe(false);
  });
});
