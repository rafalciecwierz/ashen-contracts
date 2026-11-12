import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// `server-only` throws unless it is resolved with Next.js's `react-server`
// condition. Tests import the server modules directly, so it is a no-op here.
vi.mock('server-only', () => ({}));

// Testing Library only unmounts by itself when test globals are on, and they
// are off (tests import describe/it/expect from 'vitest').
afterEach(() => {
  cleanup();
});
