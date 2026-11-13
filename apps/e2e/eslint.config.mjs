// @ts-check
// Formatting is Prettier's job (root `pnpm format`), so eslint-config-prettier only switches off
// the stylistic rules that would conflict with it.
import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['playwright-report/', 'test-results/']),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  // Catches the classic e2e mistakes: a missing `await` on an assertion or action, a fixed
  // `waitForTimeout`, a committed `test.only`.
  {
    files: ['tests/**'],
    ...playwright.configs['flat/recommended'],
  },
  eslintConfigPrettier,
]);
