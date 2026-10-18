import { Transform } from 'class-transformer';

/**
 * Trims and lowercases an email. A non-string is returned unchanged, so
 * `@IsEmail()` can reject it.
 */
export function normalizeEmail(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

/**
 * Applies normalizeEmail before validation, so `Test@X.com ` and
 * `test@x.com` are the same account on register and login. The global
 * ValidationPipe runs with `transform: true`, which applies it.
 */
export const NormalizeEmail = () =>
  Transform(({ value }: { value: unknown }) => normalizeEmail(value));
