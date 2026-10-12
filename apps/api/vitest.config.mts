import { defineConfig } from 'vitest/config';

// No SWC plugin needed: Vite 8's Oxc transformer reads emitDecoratorMetadata
// from tsconfig.json and emits the design:paramtypes metadata that NestJS
// dependency injection relies on.
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/**/*.spec.ts'],
      reportsDirectory: './coverage',
    },
  },
});
