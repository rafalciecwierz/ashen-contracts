// @ts-check
// Formatting is Prettier's job (root `pnpm format`), so eslint-config-prettier only switches off
// the stylistic rules that would conflict with it.
import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import storybook from 'eslint-plugin-storybook';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  // `.storybook` is a dot-folder, which ESLint skips unless it is un-ignored explicitly.
  globalIgnores(['storybook-static/', 'coverage/', '!.storybook']),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  storybook.configs['flat/recommended'],
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  eslintConfigPrettier,
]);
