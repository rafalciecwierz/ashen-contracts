import 'server-only';
import { z } from 'zod';

const serverEnvSchema = z.object({
  /** Base URL of the NestJS API, without a trailing slash. */
  API_URL: z.url(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let serverEnv: ServerEnv | undefined;

/**
 * The server-side environment, validated on first use and then cached.
 * Not at import time: `next build` imports the route handlers to collect page
 * data, and CI builds without these variables.
 */
export function getServerEnv(): ServerEnv {
  if (!serverEnv) {
    const result = serverEnvSchema.safeParse(process.env);
    if (!result.success) {
      throw new Error(
        `Invalid environment (see apps/web/.env.example):\n${z.prettifyError(result.error)}`,
      );
    }
    serverEnv = result.data;
  }
  return serverEnv;
}
