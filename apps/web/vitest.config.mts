import { defineConfig } from 'vitest/config';

// Unit and component tests for code that runs outside the browser's real
// Next.js runtime: pure helpers, Server Actions (with next/* mocked) and
// client components rendered in jsdom. Whole pages, with a real server and
// browser, are WEB-11's Playwright tests.
export default defineConfig({
  // `@/*` from tsconfig.json, so tests import the way the app does.
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.{ts,tsx}'],
    setupFiles: ['./test/setup.ts'],
  },
});
