import { z } from 'zod';

// Every environment variable the API reads. ConfigModule validates process.env
// (plus .env) against this schema at startup, so a missing or invalid value
// stops the app before it serves a request.
export const envSchema = z.object({
  // Required, with no default: a deployment that forgets it must not fall back
  // to development behaviour (e.g. Swagger).
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.url(),
  // 32 characters = 256 bits, the key size HS256 expects.
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.url().default('http://localhost:3000'),
  // Shared with apps/web. The BFF sends it in X-BFF-Secret, and only then does
  // the API trust the player IP in X-Client-IP (docs/DECISIONS.md #017).
  BFF_SECRET: z.string().min(32),
  // Reverse proxies in front of the API: 0 locally, 1 behind the Railway or
  // Render proxy. Express then takes req.ip from that many X-Forwarded-For
  // entries counted from the right, the ones a client cannot forge.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
