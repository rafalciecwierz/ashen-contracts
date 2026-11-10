import { isApiErrorCode, type ApiErrorCode } from '@ashen-contracts/shared';

/**
 * A form-level error the web app can show: a code from the API, or GENERIC
 * for one this build doesn't know (an API deployed ahead of the web app).
 * Each one is a key of the "errors" namespace in en.json; next-intl checks
 * `tErrors(code)` against it, so a code without a message fails `tsc`.
 */
export type ErrorCode = ApiErrorCode | 'GENERIC';

/** Maps any value from a response to an ErrorCode, GENERIC when unknown. */
export function toErrorCode(code: unknown): ErrorCode {
  return isApiErrorCode(code) ? code : 'GENERIC';
}
