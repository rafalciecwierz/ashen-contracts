import 'server-only';

/**
 * How long a call to the API may take before the BFF gives up on it. The API
 * on Render's free plan takes up to about a minute to wake after 15 idle
 * minutes (docs/DECISIONS.md #020), so a shorter limit would fail the first
 * request after every idle spell. Without one, Node's fetch waits up to 5
 * minutes for the response headers, as long as Vercel lets a function run on
 * the free plan, so a hung API would end in a platform error instead of the
 * form's message.
 */
export const API_TIMEOUT_MS = 90_000;
