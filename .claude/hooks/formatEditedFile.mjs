// PostToolUse hook (Edit|Write): formats the file Claude just changed, so edits match the repo's style.
// Prettier runs on every file it supports (respecting .prettierignore); ESLint --fix runs on JS/TS
// files inside a workspace that has its own eslint.config.mjs. Never blocks: leftover lint errors
// are left for `pnpm lint` and CI.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

const repoRoot = join(import.meta.dirname, '..', '..');
const LINTABLE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

function run(cmd, args, cwd) {
  try {
    execFileSync(cmd, args, { cwd, stdio: 'ignore' });
  } catch {
    // Unformattable or unfixable input: leave the file as Claude wrote it.
  }
}

const input = JSON.parse(readFileSync(0, 'utf8'));
const file = input.tool_response?.filePath ?? input.tool_input?.file_path;
if (!file || !existsSync(file)) process.exit(0);

const rel = relative(repoRoot, file);
if (rel.startsWith('..') || rel.split(sep).includes('node_modules'))
  process.exit(0);

run(
  'pnpm',
  ['exec', 'prettier', '--write', '--ignore-unknown', file],
  repoRoot,
);

if (LINTABLE.test(file)) {
  // Walk up to the nearest workspace with an ESLint config (apps/api, apps/web, packages/ui).
  for (
    let dir = dirname(file);
    dir.startsWith(repoRoot) && dir !== repoRoot;
    dir = dirname(dir)
  ) {
    if (existsSync(join(dir, 'eslint.config.mjs'))) {
      run('pnpm', ['exec', 'eslint', '--fix', '--no-warn-ignored', file], dir);
      break;
    }
  }
}
