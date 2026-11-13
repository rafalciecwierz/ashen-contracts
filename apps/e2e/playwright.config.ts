import { defineConfig, devices } from '@playwright/test';

// Dedicated ports, so the e2e servers run next to `pnpm dev` (3000 and 3001).
const WEB_PORT = 3100;
const API_PORT = 3101;
const WEB_URL = `http://localhost:${WEB_PORT}`;
const API_URL = `http://localhost:${API_PORT}`;

// Its own database in the docker-compose PostgreSQL (or the CI service container, same
// credentials), so the tests never touch development data. `prisma migrate deploy` creates it
// when it is missing.
const DATABASE_URL =
  'postgresql://ashen:ashen@localhost:5432/ashen_contracts_e2e?schema=public';

// Dummy secret shared by both servers (docs/DECISIONS.md #017). Variables set here win over a
// developer's apps/api/.env and apps/web/.env.local: neither dotenv nor Next.js overrides a
// variable that is already set.
const BFF_SECRET = 'e2e-bff-secret-not-used-anywhere-else';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL: WEB_URL,
    // CI: a trace from the first retry (docs/DECISIONS.md #015). Locally there are no retries,
    // so every test is recorded and the trace is kept for the ones that fail.
    trace: isCI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Production builds, as deployed: they cost little extra and catch what `next dev` hides.
  // Playwright starts these before any globalSetup, so the database is migrated here, before
  // the API connects to it. Locally a running server is reused (a stale build too: stop it
  // after changing app code); in CI they always start fresh.
  //
  // The server itself is started with `exec`, not through pnpm: Playwright stops a server by
  // killing the shell's process group, and pnpm runs its child in a group of its own, so the
  // server would outlive the run (and Playwright would wait for it forever).
  webServer: [
    {
      name: 'api',
      cwd: '../api',
      // What `nest build` + `start:prod` do (Nest's tsc compiler, no assets), but into
      // dist-e2e/: `nest build` empties dist/, which `nest start --watch` in `pnpm dev` runs from.
      command: [
        'pnpm migrate:deploy',
        'pnpm exec tsc -p tsconfig.build.json --outDir dist-e2e',
        'exec node dist-e2e/main.js',
      ].join(' && '),
      url: `${API_URL}/health`,
      env: {
        NODE_ENV: 'production',
        PORT: String(API_PORT),
        DATABASE_URL,
        JWT_SECRET: 'e2e-jwt-secret-not-used-anywhere-else',
        BFF_SECRET,
        CORS_ORIGIN: WEB_URL,
        TRUST_PROXY_HOPS: '0',
      },
      reuseExistingServer: !isCI,
      timeout: 180_000,
    },
    {
      name: 'web',
      cwd: '../web',
      command: 'pnpm build && exec node_modules/.bin/next start',
      url: WEB_URL,
      // NODE_ENV comes from Next.js itself (production for build and start).
      env: {
        PORT: String(WEB_PORT),
        API_URL,
        BFF_SECRET,
      },
      reuseExistingServer: !isCI,
      timeout: 300_000,
    },
  ],
});
