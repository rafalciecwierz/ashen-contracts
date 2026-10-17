import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.integration-spec.ts'],
    // AppModule validates the environment at startup (src/config/env.schema.ts).
    // Dummy values; they win over apps/api/.env, so tests never use real secrets.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        'postgresql://ashen:ashen@localhost:5432/ashen_contracts?schema=public',
      JWT_SECRET: 'integration-test-secret-not-used-anywhere-else',
    },
  },
});
