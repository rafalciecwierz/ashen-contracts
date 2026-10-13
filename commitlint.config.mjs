// Conventional Commits: `type(scope): subject`; the scope and a `[TASK-ID]` suffix are optional.
// See "Commit messages" in CLAUDE.md.
// Checked locally by the commit-msg hook (simple-git-hooks) and in CI for every pushed commit.
export default {
  extends: ['@commitlint/config-conventional'],
};
