# Roadmap — Ashen Contracts

## Versioning philosophy

This project has no fixed end date — development continues at whatever pace fits alongside job searching (and later, alongside a job). To make that sustainable:

- Every version must be a **complete vertical slice** — fully working and playable, never a half-built feature left dangling. "Added a working hunting encounter" not "started the inventory system."
- Versions are tagged in git (`v0.1.0`, `v0.2.0`...) and logged in [`CHANGELOG.md`](../CHANGELOG.md) — the history of iterative, shippable releases is itself a portfolio artifact, not just the current state of the code.
- There's a deliberate **MVP checkpoint** (through v0.4) — a version worth showing in an interview on short notice, since the job search timeline is unknown. Everything after that is open-ended, unpressured iteration.
- Stretch ideas from `docs/GAME_DESIGN.md` (PIXI.js mini-games, deeper origin-story branching) aren't rejected — they're just future versions, not near-term scope.

Status legend: 🔲 planned · 🔶 in progress · ✅ shipped

---

## v0.1 — Foundation & the character 🔶

The skeleton: something real, deployed, and playable, even if rough.

- [x] Auth (NestJS + JWT)
- [x] Auth (Shared types setup)
- [x] Auth (Storybook setup and wiring up with web app)
- [x] `packages/ui`: Storybook, Button/Input/Modal components, shared Tailwind v4 design tokens
- [x] `/register` screen (Zod validation, i18n, typed API client)
- [x] `/login` screen (context-aware copy, `?redirect=` support, BFF + httpOnly cookie)
- [x] JWT Guard protecting authenticated endpoints (global, opt-out via `@Public()`)
- [x] Navbar on `/play` (logo, user menu with logout)
- [ ] Navbar on public pages (logo, login/register links)
- [ ] Game layout (`docs/GAME_DESIGN.md` "Screen layout"): top bar with logo, character name, energy and the avatar menu (settings, log out); left column with game navigation; right column with the character's avatar, origin, traits and starting stats (from `docs/features/02-character-creation.md`); center column driven by the URL. The level joins in v0.3
- [ ] Short character creation flow (race/origin choice, starting traits)
- [ ] Single starting location (the clearing)
- [ ] Energy resource, server-authoritative time-based regeneration
- [ ] Scripted opening quest ("First Blood" — bandit encounter)
- [x] E2E tests: Playwright in `apps/e2e`, auth flow, own CI job (plan: `docs/REFACTOR.md` WEB-11, decision: `docs/DECISIONS.md` #015)
- [ ] Deploy, free plans only: Vercel (web), Render (api), Prisma Postgres (db) (`docs/DECISIONS.md` #020)

## v0.2 — Map & adventures 🔲

The base loop: map → adventure → outcome → go again.

- [ ] Map view (`/map`): a plain list of locations, locked ones shown as such
- [ ] Second location (the forest), so the map has a choice
- [ ] Adventure: instant, costs energy (per location), resolves server-side into an outcome drawn from the location's pool
- [ ] Ready outcomes only (text plus a fixed effect): mundane, reward, complication
- [ ] Outcome screen with "Go again" and "Back to map"
- [ ] Basic inventory (items from outcomes)

## v0.3 — Stats, XP & leveling 🔲

- [ ] XP from adventures/quests, leveling
- [ ] Level and XP in the top bar and the character column
- [ ] Core stats (e.g. Might, Wits, Resolve)
- [ ] Interactive outcomes: an outcome that stops on a player choice before its effect
- [ ] Stat-based skill checks in interactive outcomes
- [ ] First item-gated alternate resolution (the "acorn & squirrel" pattern)

## v0.4 — The stronghold 🔲

- [ ] Triggering quest that unlocks the stronghold
- [ ] Training (skill/stat progression with a real-world duration via a queued system — first use of BullMQ; choose a free Redis host first, see `docs/DECISIONS.md` #020)
- [ ] Blacksmith/armory (purchasable equipment)
- [ ] Adventure-only loot distinct from purchasable gear

### 🏁 MVP checkpoint — interview-ready

Through v0.4, the game has a full loop: create a character, go on adventures, level up, unlock and grow a base. This is the version to demo if a job opportunity comes up before the rest is built.

---

## v0.5 and beyond — open-ended

No fixed scope past this point; each version is planned and logged individually in `CHANGELOG.md` as it's built. Known candidates, roughly in order of likely priority:

- [ ] Contracts: special missions for a grown character in harder locations (`docs/GAME_DESIGN.md` "Contracts")
- [ ] Real-time notifications (Socket.io) for completed actions (training)
- [ ] More locations with their own outcome pools
- [ ] Reputation system
- [ ] Deeper training/skill tree
- [ ] Player-to-player interaction (leaderboard, trading)
- [ ] More outcome content for existing locations
- [ ] Skill-based mini-challenges as an alternative to stat checks
- [ ] PIXI.js mini-games for select events (stretch)
- [ ] Deeper origin-story reveals (stretch)

## Log

_(short entries — date + what shipped, mirrors the git tag history)_

- [date]: [what shipped]
