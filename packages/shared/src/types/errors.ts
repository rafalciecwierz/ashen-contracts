/**
 * Stable error codes the API can return. A type-only union (no runtime
 * object): nothing needs to list the codes at runtime, and a union costs
 * nothing in either app's bundle.
 *
 * Backend: annotate the literal you throw against this type, so a typo is
 * caught at compile time instead of silently reaching the client. The global
 * exception filter gives errors thrown without a code a generic one from their
 * HTTP status (BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, TOO_MANY_REQUESTS,
 * INTERNAL_ERROR).
 * Frontend: type ApiError.code against this, so the i18n error dictionary
 * must have a message for every code.
 */
export type ApiErrorCode =
  // Auth
  | 'EMAIL_ALREADY_REGISTERED'
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHORIZED'
  | 'SESSION_EXPIRED'
  | 'TOO_MANY_REQUESTS'
  // Generic
  | 'VALIDATION_FAILED'
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR';

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
