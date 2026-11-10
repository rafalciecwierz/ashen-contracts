/**
 * Stable error codes the API can return, as a runtime list: the web app
 * checks a response's code against it (`isApiErrorCode`), because an API
 * deployed ahead of the web app can send a code this build doesn't know.
 *
 * Backend: annotate the literal you throw against `ApiErrorCode`, so a typo is
 * caught at compile time instead of silently reaching the client. The global
 * exception filter gives errors thrown without a code a generic one from their
 * HTTP status (BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, TOO_MANY_REQUESTS,
 * INTERNAL_ERROR).
 * Frontend: the i18n error dictionary must have a message for every code.
 */
export const API_ERROR_CODES = [
  // Auth
  'EMAIL_ALREADY_REGISTERED',
  'INVALID_CREDENTIALS',
  'UNAUTHORIZED',
  'SESSION_EXPIRED',
  'TOO_MANY_REQUESTS',
  // Generic
  'VALIDATION_FAILED',
  'BAD_REQUEST',
  'NOT_FOUND',
  'INTERNAL_ERROR',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return (API_ERROR_CODES as readonly unknown[]).includes(value);
}

/** One violated rule of a request field, in a VALIDATION_FAILED response. */
export interface ValidationErrorDetail {
  /** Dotted path of the field, e.g. `email` or `address.city`; empty for the body itself. */
  field: string;
  /** Zod issue code, e.g. `invalid_format`, `too_small`, `unrecognized_keys`. */
  constraint: string;
  /** English description, for logs and developers, not for display. */
  message: string;
}

/** Body of every API error response. The HTTP status is not repeated in it. */
export interface ApiErrorResponse {
  code: ApiErrorCode;
  message: string;
  /** Only on VALIDATION_FAILED. */
  details?: ValidationErrorDetail[];
}
