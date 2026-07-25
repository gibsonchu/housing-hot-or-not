// Database access for the API routes.
//
// Production runs against Vercel Postgres (Neon) over postgres.js. Local dev,
// where no POSTGRES_URL is set, runs against PGlite — real Postgres compiled to
// WASM, persisted under .pglite — so the same SQL is exercised either way and
// no one has to install a server to work on this.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONNECTION = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';

let clientPromise = null;

async function connect() {
  if (CONNECTION) {
    const { default: postgres } = await import('postgres');
    // prepare:false is required when going through Neon's pgbouncer pooler.
    const sql = postgres(CONNECTION, { prepare: false, idle_timeout: 20, max: 3 });
    return {
      query: (text, params = []) => sql.unsafe(text, params),
      // Multi-statement scripts need the simple protocol.
      exec: (text) => sql.unsafe(text).simple(),
      begin: (fn) => sql.begin((tx) => fn({ query: (t, p = []) => tx.unsafe(t, p) })),
    };
  }
  // PGlite writes to disk, which a serverless filesystem won't allow — and even
  // if it did, each instance would get its own throwaway copy.
  if (process.env.VERCEL) {
    throw new Error(
      'No database configured. Attach a Vercel Postgres store to this project ' +
      'so POSTGRES_URL is set, then redeploy.'
    );
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const db = await PGlite.create(join(HERE, '..', '.pglite'));
  const query = async (text, params = []) => (await db.query(text, params)).rows;
  return {
    query,
    exec: (text) => db.exec(text),
    // PGlite is single-connection, so a plain transaction block is enough.
    begin: async (fn) => {
      await db.exec('begin');
      try {
        const out = await fn({ query });
        await db.exec('commit');
        return out;
      } catch (e) {
        await db.exec('rollback');
        throw e;
      }
    },
  };
}

async function init() {
  const client = await connect();
  const schema = await readFile(join(HERE, '_schema.sql'), 'utf8');
  await client.exec(schema);
  await seedBuildings(client);
  return client;
}

export function db() {
  if (!clientPromise) clientPromise = init().catch((e) => { clientPromise = null; throw e; });
  return clientPromise;
}

/** Convenience: run one statement, get rows back. */
export async function sql(text, params = []) {
  const client = await db();
  return client.query(text, params);
}

export async function tx(fn) {
  const client = await db();
  return client.begin(fn);
}

export const expected = (a, b) => 1 / (1 + Math.pow(10, (b - a) / 400));
export const K_FACTOR = 32;
export const OPTION_K = 24;
export const START_RATING = 1400;

// Source: NYC Open Data, "Affordable Housing Production by Building".
const SEED = [
  ['747 Thomas Boyland Street', 'Brownsville · Brooklyn', 'Mid-Rise'],
  ['1640 Flatbush Avenue', 'Flatbush · Brooklyn', 'Tower'],
  ['123 Grand Street', 'Greenpoint · Brooklyn', 'Mid-Rise'],
  ['268 Sullivan Place', 'Crown Heights · Brooklyn', 'Low-Rise'],
  ['1644 New York Avenue', 'East Flatbush · Brooklyn', 'Low-Rise'],
  ['180 Pennsylvania Avenue', 'East New York · Brooklyn', 'Mid-Rise'],
  ['2216 Aqueduct Avenue East', 'Fordham · Bronx', 'Low-Rise'],
  ['683 Tinton Avenue', 'Mott Haven · Bronx', 'Tower'],
  ['2495 Sedgwick Avenue', 'Kingsbridge · Bronx', 'Tower'],
  ['4523 White Plains Road', 'Williamsbridge · Bronx', 'Tower'],
  ['978 Summit Avenue', 'Concourse · Bronx', 'Mid-Rise'],
  ['2769 Creston Avenue', 'Kingsbridge · Bronx', 'Mid-Rise'],
  ['1440 Amsterdam Avenue', 'Morningside Heights · Manhattan', 'Tower Complex'],
  ['101 Macombs Place', 'Central Harlem · Manhattan', 'Low-Rise'],
  ['336 East 112 Street', 'East Harlem · Manhattan', 'Low-Rise'],
  ['25 Water Street', 'Financial District · Manhattan', 'Tower Complex'],
  ['183 Chrystie Street', 'Lower East Side · Manhattan', 'Mid-Rise'],
  ['38-38 32 Street', 'Astoria · Queens', 'Mid-Rise'],
  ['83-07 Queens Boulevard', 'Elmhurst · Queens', 'Mid-Rise'],
  ['1605 Village Lane', 'Far Rockaway · Queens', 'Tower'],
  ['188-11 Hillside Avenue', 'Jamaica Estates · Queens', 'Tower'],
  ['97-04 Sutphin Boulevard', 'Jamaica · Queens', 'Tower'],
  ['5 Stuyvesant Place', 'St. George · Staten Island', 'Mid-Rise'],
];

async function seedBuildings(client) {
  const rows = await client.query('select count(*)::int as n from buildings');
  if (Number(rows[0].n) > 0) return;
  for (let i = 0; i < SEED.length; i++) {
    const [address, neighborhood, type] = SEED[i];
    await client.query(
      `insert into buildings (id, address, neighborhood, building_type, rating)
       values ($1, $2, $3, $4, $5) on conflict (id) do nothing`,
      ['seed' + i, address, neighborhood, type, START_RATING]
    );
  }
}

/** Shared response helpers. */
export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

export function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

/** Upsert the voter row and bump last_seen_at. */
export async function touchVoter(client, voterId) {
  await client.query(
    `insert into voters (id) values ($1)
     on conflict (id) do update set last_seen_at = now()`,
    [voterId]
  );
}
