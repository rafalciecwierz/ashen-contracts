/**
 * Stable error codes the API can return. Kept as a type-only union (no
 * runtime object) to stay consistent with the rest of packages/shared —
 * see docs/DECISIONS.md for why shared is import-type-only.
 *
 * Backend: annotate the literal you throw against this type, so a typo is
 * caught at compile time instead of silently reaching the client.
 * Frontend: type ApiError.code against this (plus a fallback string) so
 * the i18n error dictionary can be checked against the same set of keys.
 */
export type AuthErrorCode = 'EMAIL_ALREADY_REGISTERED' | 'INVALID_CREDENTIALS';