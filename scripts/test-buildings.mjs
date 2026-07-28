#!/usr/bin/env node
//
// Adds (or removes) a set of obviously-fake buildings for testing the voting
// flow, rankings, and insights without touching the real seeded data. Every
// address starts with "Test Building", which is what --remove matches on.
//
//   node scripts/test-buildings.mjs
//   node scripts/test-buildings.mjs --remove
//   BASE=https://building-taste-nyc.vercel.app ADMIN_PASSWORD=... node scripts/test-buildings.mjs
//
// Photos are inline SVG data URIs so each card is visually distinct and nothing
// depends on an external image host.

const BASE = process.env.BASE || 'http://localhost:5173';
const PASSWORD = process.env.ADMIN_PASSWORD || 'vercel2020';
const REMOVE = process.argv.includes('--remove');

const PREFIX = 'Test Building';

const SPECS = [
  ['A', 'Brick walk-up',      'Test Ward · Brooklyn',      'Low-Rise'],
  ['B', 'Glass tower',        'Test Ward · Manhattan',     'Tower'],
  ['C', 'Concrete slab',      'Test Ward · Bronx',         'Mid-Rise'],
  ['D', 'Metal panel infill', 'Test Ward · Queens',        'Mid-Rise'],
  ['E', 'Stone mid-rise',     'Test Ward · Staten Island', 'Mid-Rise'],
  ['F', 'Timber low-rise',    'Test Ward · Brooklyn',      'Low-Rise'],
  ['G', 'Mixed-use block',    'Test Ward · Queens',        'Tower Complex'],
  ['H', 'Courtyard building', 'Test Ward · Bronx',         'Mid-Rise'],
];

// Distinct flat tones so two test cards never look alike side by side.
const TONES = ['#9aa5b1', '#7c8ea0', '#a8a29a', '#8d9c8f', '#a09aa8', '#96a3a8', '#ab9d92', '#8f97a6'];

function placeholder(letter, tone, label) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">` +
    `<rect width="400" height="400" fill="${tone}"/>` +
    `<text x="200" y="196" font-family="Georgia,serif" font-size="150" fill="#fff" ` +
    `fill-opacity="0.85" text-anchor="middle">${letter}</text>` +
    `<text x="200" y="250" font-family="Helvetica,Arial,sans-serif" font-size="19" fill="#fff" ` +
    `fill-opacity="0.8" letter-spacing="1.5" text-anchor="middle">${label.toUpperCase()}</text>` +
    `</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const buildings = SPECS.map(([letter, label, neighborhood, type], i) => ({
  address: `${PREFIX} ${letter} — ${label}`,
  neighborhood,
  type,
  photo: placeholder(letter, TONES[i], label),
}));

async function call(method, body) {
  const res = await fetch(`${BASE}/api/admin`, {
    method,
    headers: { 'content-type': 'application/json', 'x-admin-password': PASSWORD },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) {}
  if (!res.ok) {
    throw new Error(`${res.status} ${(data && (data.detail || data.error)) || text.slice(0, 200)}`);
  }
  return data;
}

async function main() {
  console.log(`${REMOVE ? 'Removing' : 'Adding'} test buildings at ${BASE}`);

  const { buildings: existing } = await call('GET');
  const tests = existing.filter((b) => b.address.startsWith(PREFIX));

  if (REMOVE) {
    if (!tests.length) return console.log('No test buildings found — nothing to remove.');
    for (const b of tests) {
      await call('POST', { action: 'delete', id: b.id });
      console.log(`  removed ${b.address}`);
    }
    return console.log(`Removed ${tests.length}.`);
  }

  if (tests.length) {
    console.log(`${tests.length} test building(s) already present — run with --remove first to replace them.`);
    return;
  }
  const r = await call('POST', { action: 'create', buildings });
  for (const b of buildings) console.log(`  added ${b.address}`);
  console.log(`Added ${r.created}. Total buildings now ${existing.length + r.created}.`);
}

main().catch((e) => {
  console.error(`Failed: ${e.message}`);
  process.exit(1);
});
