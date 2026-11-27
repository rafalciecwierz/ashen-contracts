# Design — Ashen Contracts

The visual direction of the game: first the brief everyone agreed to (DS-02), then, once a direction is chosen, the style guide that new components follow (DS-05). Agents building UI read this file together with the `frontend-design` skill; where they disagree, this file wins.

**Status:** brief agreed (2026-11-26). Landing page chosen: Forge (`docs/design/round-1/forge.html`), built on the owner's `logo-start.png`. Game screens chosen (2026-11-27): Reliquary (`docs/design/round-2/reliquary.html`), refined in round 3.

**Reliquary: what stays, what changes.**

- Stays: the palette (char, bronze, blood, fire) and the ornaments (gothic spiked corners, spiked plaques, diamond sockets); the energy orb of liquid fire in the left column; the game-icons.net icons; reward and item slots with rarity borders and tooltips.
- Changes: the primary button ("Go again") is no longer blood red; round 3 tries other colours. Individual components will be reworked as they are built.
- Borrowed from Panorama: a decorated scene frame for each location (SVG art, the location's name on a plaque) above the event text.

**Lesson from round 1:** five skins over one skeleton (centred title, divider, drop cap, two buttons, chips, round portrait, three stat tiles) all read as generated. A direction has to change the composition and borrow the vocabulary of real games (a scene, a map with pins, cards, an orb, item slots), not only the texture. Real illustration lifts a screen more than any CSS ornament.

## Brief

### Audience and the job of each screen

Two audiences, both first-class:

- **A recruiter** gives the project half a minute. The landing page is the showpiece: the strongest, most atmospheric screen, with continuous motion allowed.
- **A player** comes back several times a day and reads a lot of narrative text. The game screens are practical first, but still beautiful and in the game's mood. A plain, generic app look is not acceptable anywhere.

### Character

- **Heavily ornamented, not light.** The interface itself carries the mood, not just the text: dungeon, tome, Dungeons & Dragons, the Witcher. Frames, borders, dividers, initials, textures and icons are welcome.
- **Narrative text stays central.** Ornament frames the story; it never competes with it for legibility.
- **References:** Andrzej Sapkowski's _Witcher_, _Darkest Dungeon_, _Fallen London_ / _Sunless Sea_.
- **Clean slate.** The earlier mockups (Chronicle and the others) and their draft tokens were deleted; they are in git history only. No earlier choice of colour, font or layout carries over by default.

### Ornament sources

Anything that works: SVG drawn in code (frames, corners, dividers, initials, noise textures), raster textures, icons. Every third-party asset needs a licence that allows it in a public repo:

- textures: CC0 (e.g. ambientCG, Poly Haven), or made in-house;
- icons: [game-icons.net](https://game-icons.net) (CC BY 3.0), credited in the footer and README;
- fonts: open licences (OFL), self-hosted through `next/font`.

### Logos

The owner's logos are in `docs/design/assets/logo/`. They set the mood but are not final, and a proposal may draw its own mark:

- `logo-start.png`: forged, cracked iron lettering, a phoenix in a rune circle, embers, chains, a skull, on dark stone. Photorealistic and grim.
- `logo-game.svg`: an inked, cel-shaded mark in gold and violet, with crossed swords, a rose, a bird skull and a scroll with a wax seal.

The two speak different visual languages (grim realism against stylised illustration). Which one the game follows is an open question for round 1, not a given.

The violet in `logo-game.svg` is not a brand colour: it came from the template's `brand-*` token in `packages/ui/src/styles/theme.css`, which was put into the logo's prompt. It reads as generic, so it carries no weight in the proposals; a direction uses violet only if it has its own reason (for example, witchcraft or arcane magic).

### Motion

- **Landing page:** continuous ambient motion is fine (embers, smoke, flicker).
- **Game screens:** none, or barely perceptible. Motion answers the player's actions (an outcome appearing, the energy meter filling), not the passing of time.

### Mobile

First-class, with its own layout. The desktop three-column shell from `docs/GAME_DESIGN.md` "Screen layout" becomes one column with a bottom bar: Map, Character, Journal, and More, which opens a sheet with the rest (Stronghold, Ranking, Settings). The character view also opens from the avatar in the top bar.

### Non-negotiable floor

Every proposal and every component meets these, however ornate:

- text contrast WCAG AA (4.5:1 body, 3:1 large text), measured against the texture behind it, not a flat colour;
- ornaments are `aria-hidden` and carry no information that isn't also in text;
- visible keyboard focus on everything interactive;
- `prefers-reduced-motion` turns animation off;
- touch targets at least 44 px;
- fonts cover Polish (ą, ć, ę, ł, ń, ó, ś, ź, ż): content is English for now, a Polish locale comes later.

### What to avoid

The `frontend-design` skill lists the traits that make generated design look generated. They are not banned outright, but each needs a reason specific to this game: a near-black background with one warm orange accent; a cream background with a serif and a terracotta accent; tracked all-caps eyebrow labels above every heading; meta strings joined with middle dots; a monospace face for small data labels; identical rounded cards with the same soft shadow.

## Process

1. **Round 1, sketches** (`docs/design/round-1/`): as many directions as are worth trying, each as a landing page and the desktop game screen, with a clickable path: "Log in" on the landing page opens the game screen. Outcome: the Forge landing page; no game screen.
   **Round 2, game views** (`docs/design/round-2/`): four new game screens in the Forge family, each with its own composition. Outcome: Reliquary, with Panorama's scene frame.
2. **Round 2, full versions** of the chosen one or two: mobile, a component sheet (button, input, panel, energy meter, navigation item), and the whole loop: map → the forest → outcome → "Go again" / "Back to map".
3. **Round 3, refinement** of the winner.
4. **Then:** tokens can be written as soon as the direction is chosen (DS-03); components are extracted into Storybook from the finished desktop and mobile design (DS-04); this file becomes the style guide (DS-05).

Each round has an `index.html` comparing its directions. Prototype copy is English and follows the tone of `docs/GAME_DESIGN.md`.

**Judging each round** (the agent scores and explains, the owner decides):

1. mood: does it feel like the Witcher, _Darkest Dungeon_, _Fallen London_?
2. legibility over a long reading session;
3. distinctiveness: does it pass the `frontend-design` test for generated design?
4. mobile;
5. cost to build in Tailwind and `packages/ui`.

## Style guide

Written in DS-05, once the direction is chosen: principles, token use, ornament rules, do and don't, and a checklist for a new component.
