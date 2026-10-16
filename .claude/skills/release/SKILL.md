---
name: release
description: Cut a version: move CHANGELOG [Unreleased] into the version, tick ROADMAP, and print the git tag and push commands for the user to run.
argument-hint: <version, e.g. 0.1.0>
disable-model-invocation: true
---

# Release

Cuts version `$ARGUMENTS` (semver, without the `v`). The git tag `v$ARGUMENTS` and `CHANGELOG.md` are the project's version record. The `version` fields in `package.json` are left alone: every workspace is private and never published, so they carry no meaning. You prepare the release commit; **the user commits, tags and pushes**. Never run `git commit`, `git tag` or `git push` yourself.

## 1. Check that the version is ready

Stop and report on the first failure:

- `$ARGUMENTS` is valid semver and higher than the newest tag (`git tag --sort=-v:refname | head -1`), and `v$ARGUMENTS` doesn't exist yet.
- On `main`, the working tree is clean, and `main` matches `origin/main` after `git fetch`.
- The matching ROADMAP version (`## v0.1 — ...` for `0.1.x`) has every item ticked. Each version must be a complete vertical slice (ROADMAP, "Versioning philosophy"); an unticked item means it isn't done. Patch releases (`0.1.1`) skip this check.
- `CHANGELOG.md` `[Unreleased]` has at least one real entry.
- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass. Ask the user to confirm that CI on `main` is green too.

## 2. Prepare the release commit

**`CHANGELOG.md`** ([Keep a Changelog](https://keepachangelog.com/en/1.1.0/)):

- Move every entry under `[Unreleased]` into a new `## [$ARGUMENTS] - YYYY-MM-DD` section (today's date) directly below it. Drop empty sections and `-` placeholders.
- Leave `## [Unreleased]` in place with empty `### Added`, `### Changed`, `### Fixed` headings, as it is now.
- Fix entry formatting on the way (e.g. a missing space after `-`), but don't reword entries.
- Update the link references at the end of the file, adding them on the first release. For `0.1.0`:

  ```md
  [Unreleased]: https://github.com/rafalciecwierz/ashen-contracts/compare/v0.1.0...HEAD
  [0.1.0]: https://github.com/rafalciecwierz/ashen-contracts/releases/tag/v0.1.0
  ```

  From the second release on, a version links to the compare view from the previous tag (`compare/v0.1.0...v0.2.0`).

**`docs/ROADMAP.md`:** change the version heading's marker to ✅, mark the next version 🔶 if work on it starts now, and add a line to "Log" (`- YYYY-MM-DD: v0.1.0 — <one-line summary>`), replacing the `[date]: [what shipped]` placeholder the first time.

**`CLAUDE.md` "Current status":** the version in progress and the last completed release.

Run `pnpm format:check`.

## 3. Hand over

Show the diff summary, then give the user the commands, in order:

```sh
git add CHANGELOG.md docs/ROADMAP.md CLAUDE.md
git commit -m "chore: release v$ARGUMENTS"
git tag -a v$ARGUMENTS -m "v$ARGUMENTS"
git push origin main
git push origin v$ARGUMENTS
```

An annotated tag records who tagged and when, so it is what `git describe` and GitHub use. Push the one tag by name, not `--tags`, which pushes every local tag. If `main` is protected, the release commit goes through a PR, and the tag goes on the merge commit after the merge.
