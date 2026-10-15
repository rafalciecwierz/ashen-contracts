---
name: adr
description: Record an architecture decision in docs/DECISIONS.md in the project's ADR format. Use when a hard-to-reverse technical decision with real alternatives has just been made, or when the user asks to record, supersede or explain a decision.
---

# Architecture decision record

`docs/DECISIONS.md` is the project's single ADR log. It doubles as interview preparation: the owner must be able to justify every technical decision, so each entry records **why**, and what was rejected.

## When an ADR is worth it

Offer one only when all three are true (criteria adapted from [mattpocock/skills](https://github.com/mattpocock/skills), MIT):

1. **Hard to reverse:** changing your mind later has a real cost (a database driver, the test runner, a deployment target; not a helper library).
2. **Surprising without context:** a future reader would ask "why did they do it this way?" or might "fix" something deliberate.
3. **A real trade-off:** there were genuine alternatives, and one was picked for specific reasons.

If one is missing, skip the ADR; a CHANGELOG line or a code comment is enough. Propose the entry and let the user confirm the reasoning: the decision and its motives are theirs, not yours.

## Format

Append at the end, numbered after the highest existing entry (three digits). Each field is its own paragraph, and the date is `DD.MM.YYYY`:

```md
## 014. <Decision, phrased as what was chosen>

Date: 14.10.2026

Context: the problem and the forces at play, with concrete facts (versions, error messages, constraints).

Decision: what was chosen, specifically enough that someone could check the code against it.

Alternatives considered:

- <Option>. Rejected: <specific reason>.
- <Option>. Rejected: <specific reason>.

Consequences: what this means in practice, including the costs. Mention how it was verified, if it was.
```

## Rules

- **Never rewrite or delete an entry.** When a decision changes, add a new entry and add `Status: **Superseded by #NNN.** <one line why>` under the old entry's date (see #004 and #006).
- Keep it short: a few sentences per field, not a design doc. Link to `docs/features/` or `docs/REFACTOR.md` for detail.
- Write facts, not hype: real error messages, versions and measurements beat adjectives.
- Run `pnpm format:check` afterwards. Don't commit; propose a `docs:` commit message.
