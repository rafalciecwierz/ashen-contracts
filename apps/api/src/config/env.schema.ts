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
