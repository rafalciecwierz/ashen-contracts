import { z } from 'zod';

/**
 * Request bodies of the auth endpoints, validated by the API (the rules that
 * count, since the API is public) and by the web app's forms (so the player
 * sees a mistake before the request). Schemas carry no messages: the API
 * answers with Zod's English ones, and the web app maps each issue to a
 * translation key.
 *
 * Request bodies use `z.strictObject`, so a field the schema doesn't declare
 * is a 400 (VALIDATION_FAILED, `unrecognized_keys`) instead of reaching the
 * service. `.meta({ example })` is the example Swagger shows.
 * @see docs/DECISIONS.md #022
 */

/** Minimum password length at registration. */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Trimmed and lowercased before the format check, so `Test@X.com ` and
 * `test@x.com` are one account on register and login. The format goes into
 * `meta` too: JSON Schema (Swagger) describes the input, a plain string
 * before the pipe.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email())
  .meta({ format: 'email', example: 'player@example.com' });

/** Body of `POST /auth/register`. */
export const registerSchema = z.strictObject({
  email: emailSchema,
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH)
    .meta({ example: 'password123' }),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Body of `POST /auth/login`. The password only has to be non-empty: login
 * checks it against the stored hash, and repeating the registration rules
 * here would tell a guesser what a valid password looks like.
 */
export const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1).meta({ example: 'password123' }),
});
export type LoginInput = z.infer<typeof loginSchema>;
