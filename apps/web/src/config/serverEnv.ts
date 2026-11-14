import 'server-only';
import { z } from 'zod';

// Plain HTTP stays on this machine only for these hosts, e.g. the e2e tests'
// production build calling the API on localhost.
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

// Every environment variable the web app's server side reads, like
// apps/api/src/config/env.schema.ts.
const serverEnvSchema = z
  .object({
    // Set by Next.js itself: production for `next build` and `next start`.
    NODE_ENV: z.enum(['development', 'production', 'test']),
    /** Base URL of the NestJS API, without a trailing slash. */
    API_URL: z.url({ protocol: /^https?$/ }),
    // Shared with apps/api, sent in X-BFF-Secret (docs/DECISIONS.md #017).
    // 32 characters, as the API requires.
    BFF_SECRET: z.string().min(32),
  })
  // Every request to the API carries BFF_SECRET, so in production it must not
  // travel in clear text.
  .refine(
    (env) => env.NODE_ENV !== 'production' || isHttpsOrLoopback(env.API_URL),
    {
      path: ['API_URL'],
      message: 'Must be https:// in production (http:// only for localhost)',
      // Zod runs an object's refinements even when a field failed; this one
      // needs a parsed URL, so only once the fields are valid.
      when: (payload) => payload.issues.length === 0,
    },
  );

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function isHttpsOrLoopback(url: string): boolean {
  const { protocol, hostname } = new URL(url);
  return protocol === 'https:' || LOOPBACK_HOSTNAMES.has(hostname);
}

/** Validates `env` against the schema; throws with every problem listed. */
export function parseServerEnv(
  env: Record<string, string | undefined>,
): ServerEnv {
  const result = serverEnvSchema.safeParse(env);
  if (!result.success) {
    throw new Error(
      `Invalid environment (see apps/web/.env.example):\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

let serverEnv: ServerEnv | undefined;

/**
 * The server-side environment, validated once and then cached. The server
 * calls this at startup (`src/instrumentation.ts`), so a bad value stops it
 * before the first request. Not at import time: `next build` imports the
 * routes and their Server Actions to collect page data, and CI builds without
 * these variables.
 */
export function getServerEnv(): ServerEnv {
  serverEnv ??= parseServerEnv(process.env);
  return serverEnv;
}
