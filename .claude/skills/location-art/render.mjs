#!/usr/bin/env node
// Renders location scene specs (JSON) to static SVG files with the same generator the prototypes use.
//
//   node .claude/skills/location-art/render.mjs <spec.json>...   → writes <spec>.svg next to each spec
//   node .claude/skills/location-art/render.mjs --known <dir>     → exports the built-in specs (SCENE.SPECS) as JSON + SVG into <dir>
//
// Each spec is validated against the generator's vocabulary, and each SVG against the size budget.
// Exit code 1 if anything fails.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const GENERATOR = join(ROOT, 'docs/design/shared/scenes.js');
const SIZE = { w: 1200, h: 420 };
const BUDGET = { bytes: 60_000, layers: 14 };

// Required fields per layer type (everything else is optional, see STYLE.md).
const REQUIRED = {
  ridge: ['y'],
  ground: ['y'],
  pines: ['y', 'count', 'min', 'max'],
  deadtrees: ['y', 'count', 'min', 'max'],
  mist: ['y', 'h'],
  water: ['y'],
  stumps: ['y', 'at'],
  rocks: ['y', 'count'],
  fire: ['x', 'y'],
  smoke: ['x', 'y'],
  hut: ['x', 'y'],
  mill: ['x', 'y'],
  ruins: ['x', 'y'],
  tower: ['x', 'y'],
  cave: ['x', 'y'],
  graves: ['y', 'count'],
  reeds: ['y', 'count'],
  fence: ['y', 'x0', 'x1'],
  moon: ['x', 'y'],
  birds: ['x', 'y'],
};

// The generator is a classic browser script that sets window.SCENE; run it in a sandbox.
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(GENERATOR, 'utf8'), sandbox, {
  filename: GENERATOR,
});
const SCENE = sandbox.window.SCENE;

function validate(spec, name) {
  const errors = [];
  if (!SCENE.TONES.includes(spec.tone))
    errors.push(`tone "${spec.tone}" is not one of ${SCENE.TONES.join(', ')}`);
  if (!Number.isInteger(spec.seed)) errors.push('seed must be an integer');
  if (!Array.isArray(spec.layers) || spec.layers.length === 0)
    errors.push('layers must be a non-empty array');
  else {
    if (spec.layers.length > BUDGET.layers)
      errors.push(`${spec.layers.length} layers, budget is ${BUDGET.layers}`);
    spec.layers.forEach((L, i) => {
      if (!SCENE.LAYERS.includes(L.type)) {
        errors.push(`layer ${i}: unknown type "${L.type}"`);
        return;
      }
      for (const key of REQUIRED[L.type] ?? [])
        if (L[key] === undefined)
          errors.push(`layer ${i} (${L.type}): missing "${key}"`);
      if (L.color !== undefined && ![0, 1, 2, 3].includes(L.color))
        errors.push(`layer ${i} (${L.type}): color must be 0–3`);
    });
  }
  return errors.map((e) => `${name}: ${e}`);
}

function renderTo(spec, svgPath, slug) {
  const svg = SCENE.render(spec, { ...SIZE, id: slug })
    .replace(/\n\s*/g, '\n')
    .trim();
  writeFileSync(svgPath, svg + '\n');
  const bytes = Buffer.byteLength(svg);
  const over = bytes > BUDGET.bytes;
  console.log(
    `${over ? '✗' : '✓'} ${svgPath} (${(bytes / 1024).toFixed(1)} kB)`,
  );
  return over ? [`${slug}: ${bytes} bytes, budget is ${BUDGET.bytes}`] : [];
}

const args = process.argv.slice(2);
let errors = [];
if (args[0] === '--known') {
  const dir = resolve(args[1] ?? 'docs/design/assets/locations');
  mkdirSync(dir, { recursive: true });
  for (const [slug, spec] of Object.entries(SCENE.SPECS)) {
    writeFileSync(
      join(dir, `${slug}.json`),
      JSON.stringify(spec, null, 2) + '\n',
    );
    errors.push(
      ...validate(spec, slug),
      ...renderTo(spec, join(dir, `${slug}.svg`), slug),
    );
  }
} else if (args.length) {
  for (const file of args) {
    const slug = basename(file, '.json');
    let spec;
    try {
      spec = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      errors.push(`${slug}: ${e.message}`);
      continue;
    }
    const found = validate(spec, slug);
    errors.push(...found);
    if (!found.length)
      errors.push(...renderTo(spec, file.replace(/\.json$/, '.svg'), slug));
  }
} else {
  console.error('usage: render.mjs <spec.json>... | --known [dir]');
  process.exit(2);
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
