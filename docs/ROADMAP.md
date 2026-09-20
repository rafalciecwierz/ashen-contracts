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
- [ ] Auth (NestJS + JWT)
- [ ] Short character creation flow (race/origin choice, starting traits)
- [ ] Single starting location (the clearing)
- [ ] Energy resource, server-authoritative time-based regeneration
- [ ] Scripted opening quest ("First Blood" — bandit encounter)
- [ ] Deploy: Vercel (web) + Railway/Render (api + db)

## v0.2 — Expeditions & narrative events 🔲
The mechanical signature of the game.
- [ ] Expedition system: send character to a location, resolves after a duration
- [ ] Event pool for the starting location: mundane / complication / choice outcomes
- [ ] Basic inventory (items from event outcomes)
- [ ] First item-gated alternate resolution (the "acorn & squirrel" pattern)

## v0.3 — Stats, XP & leveling 🔲
- [ ] XP from expeditions/quests, leveling
- [ ] Core stats (e.g. Might, Wits, Resolve)
- [ ] Stat-based skill checks wired into narrative events

## v0.4 — The stronghold 🔲
- [ ] Triggering quest that unlocks the stronghold
- [ ] Training (skill/stat progression via a queued system — first use of BullMQ)
- [ ] Blacksmith/armory (purchasable equipment)
- [ ] Expedition-only loot distinct from purchasable gear

### 🏁 MVP checkpoint — interview-ready
Through v0.4, the game has a full loop: create a character, explore, fight, level up, unlock and grow a base. This is the version to demo if a job opportunity comes up before the rest is built.

---

## v0.5 and beyond — open-ended
No fixed scope past this point; each version is planned and logged individually in `CHANGELOG.md` as it's built. Known candidates, roughly in order of likely priority:

- [ ] Real-time notifications (Socket.io) for completed actions
- [ ] Second location with its own event pool
- [ ] Reputation system
- [ ] Deeper training/skill tree
- [ ] Player-to-player interaction (leaderboard, trading)
- [ ] Additional locations & event content
- [ ] Skill-based mini-challenges as an alternative to stat checks
- [ ] PIXI.js mini-games for select events (stretch)
- [ ] Deeper origin-story reveals (stretch)

## Log
_(short entries — date + what shipped, mirrors the git tag history)_

- [date]: [what shipped]