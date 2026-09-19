# Game Design — Ashen Contracts

## Vision & tone
A narrative-driven, text-heavy idle RPG. The prose carries as much weight as the mechanics — event descriptions, quest text, and location flavor should read like passages from a dark-fantasy novel, not generic game copy.

**Tonal references:** Andrzej Sapkowski's *Witcher* saga (morally grey world, contracts-for-coin framing, dry/weary narrator voice) and R.A. Salvatore's *Legend of Drizzt* (a skilled outsider building a reputation and an identity in a world that doesn't know them yet).

**Structural reference:** *A Dark Room* — proof that minimal visuals + strong text + random narrative events with meaningful choices is a complete, compelling idle game on its own. This project follows that same philosophy rather than a graphics-heavy approach.

## The character
The player starts as someone whose past is deliberately unclear — not a blank slate, but a mystery even to themselves. Early gameplay hints that they are more capable than they first appear; who they *become* is shaped by the player's choices over time rather than told upfront.

**Character creation (short, at game start):**
- Choose a race/origin (flavor + minor stat bias)
- Choose a small number of starting traits/personality leanings (flavor text + minor effect — not a full skill tree at this stage)

**Opening quest — "First Blood":** the player arrives in an unfamiliar land and stumbles into a low-stakes bandit encounter. Its real purpose is narrative: it reveals to the player (and to the character) that they're not the laypeople they might have assumed — a first hint of the mystery, not an explanation of it.

## Core loop
1. Explore a location → time-based expedition (idle, resolves after a duration)
2. Expedition resolves into a **narrative event** — sometimes mundane, sometimes a meaningful choice, occasionally a skill check
3. Outcomes grant resources, items, reputation, or XP — and occasionally consequences
4. Spend resources/items on training, equipment, or unlocking new locations
5. Build reputation in the region over time, unlocking the stronghold and further story

## World & locations
The player starts with one accessible location (e.g. a clearing on the forest's edge). Reputation, quest progress, and items gradually unlock new locations, each with its own pool of possible events and narrative flavor.

Progression is geographic *and* narrative — new locations aren't just new resource sources, they're new chapters of the world's text.

## The stronghold (mid-game unlock)
After a triggering quest, the player establishes a base (a keep, hideout, or camp — name TBD). This unlocks:
- **Training** — spend resources/time to raise stats or unlock skills (functionally similar to a "technology tree" in games like OGame, but framed narratively — e.g. "study forgotten sword forms" rather than "unlock Attack Tier 2")
- **Blacksmith/armory** — purchase equipment with in-game currency
- Some equipment is **expedition-only loot**, not purchasable — this is what gives expeditions long-term value beyond raw resource farming

## Randomness & narrative events
This is the heart of what makes the game distinctive. Expeditions to the same location can resolve very differently:
- **Mundane outcome:** "You walk the clearing. Nothing of note happens." (low resource gain, sets a baseline)
- **Complication:** "You trip on an exposed root, strike your head, and wake eight hours later." → time passes, energy regenerates accordingly (a cost/benefit outcome, not purely negative)
- **Choice + conditional item check:** a squirrel is holding something. The player can chase it (risk/reward roll) or, *if they happen to be carrying an acorn from an earlier expedition*, offer it instead — guaranteeing the squirrel drops what it's holding, which is sometimes valuable and sometimes worthless

This pattern — **item-gated alternate resolutions** — is the mechanical signature of the game: exploration isn't just "roll a number," it's "does the player have what this moment needs."

### Skill checks (initial approach — scoped for v1)
Some events require a check rather than a pure die roll — e.g. a stat threshold determines success (using the character's stats/level, calculated server-side). This delivers "player choices and build matter" without needing real-time input mini-games yet.

## Character progression
- **Energy** — the base time-gated resource (see `docs/features/` for the detailed spec)
- **Experience → Levels** — gained from expeditions, quests, and events
- **Stats** — a small set (e.g. Might, Wits, Resolve) that: (a) unlock through leveling and training, and (b) determine outcomes of stat-based skill checks in narrative events

Exact stat list and formulas: to be finalized when we scope v0.2 — deliberately left open here so we don't over-design before building the base loop.

## Deliberately out of scope for v1.0 (stretch goals — revisit later)
These are good ideas, but attempting them alongside the core loop risks the project never shipping. Once v1.0 is live and demoable:

- **PIXI.js-based mini-games** for certain expedition events (visual, real-time)
- **Reflex/memory/logic challenges** (timed clicks, sequence memorization, logic puzzles) as an alternative to stat-based skill checks — this is a genuinely good idea for making player *skill* matter, not just character stats, but it's a significant scope addition and should come after the core text-driven loop works end-to-end
- **Deep branching origin story** — for v1, the "mystery" is conveyed through flavor text and a handful of hinted reveals, not a full branching narrative tree

## Scope guardrails
- No payment/monetization systems
- No fully branching narrative tree in v1 — a small number of scripted reveals tied to milestones, not a dialogue tree engine
- Resist adding new resource types before the core loop (one resource, expeditions, one location) is fully working end-to-end