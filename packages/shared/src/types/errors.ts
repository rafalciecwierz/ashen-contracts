/**
 * Stable error codes the API can return. Kept as a type-only union (no
 * runtime object), like everything else in packages/shared: the package
 * ships raw .ts with no build step, so consumers only import types from it.
 *
 * Backend: annotate the literal you throw against this type, so a typo is
 * caught at compile time instead of silently reaching the client.
 * Frontend: type ApiError.code against this (plus a fallback string) so
 * the i18n error dictionary can be checked against the same set of keys.
 */
export type AuthErrorCode = 'EMAIL_ALREADY_REGISTERED' | 'INVALID_CREDENTIALS';
