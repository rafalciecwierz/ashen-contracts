// Conventional Commits: `type(scope): subject`; the scope and a `[TASK-ID]` suffix are optional.
// See "Commit messages" in CLAUDE.md.
// Checked locally by the commit-msg hook (simple-git-hooks), in CI for every pushed commit (ci.yml),
// and for the PR title, which becomes the squash commit on main (pr-title.yml).
export default {
  extends: ['@commitlint/config-conventional'],
};
