import { Transform } from 'class-transformer';

/**
 * Trims and lowercases an email before validation, so `Test@X.com ` and
 * `test@x.com` are the same account on register and login. The global
 * ValidationPipe runs with `transform: true`, which applies it. A non-string
 * is passed through unchanged for `@IsEmail()` to reject.
 */
export const NormalizeEmail: () => PropertyDecorator = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
