import { API_ERROR_CODES } from '@ashen-contracts/shared';
import { describe, expect, it } from 'vitest';
import { toErrorCode } from './errorCode';

describe('toErrorCode', () => {
  it.each(API_ERROR_CODES)('passes the API code %s through', (code) => {
    expect(toErrorCode(code)).toBe(code);
  });

  it.each([
    'SOMETHING_NEW',
    'invalid_credentials',
    '',
    undefined,
    null,
    42,
    { code: 'INVALID_CREDENTIALS' },
  ])('maps %j to GENERIC', (code) => {
    expect(toErrorCode(code)).toBe('GENERIC');
  });
});
