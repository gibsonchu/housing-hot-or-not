# Building Taste

Live at **[building-taste-nyc.vercel.app](https://building-taste-nyc.vercel.app)** — `building-taste.vercel.app` belongs to an unrelated project. The former `facade-off.vercel.app` still resolves to the same deployment.

A head-to-head voting game for real, recently completed NYC affordable housing buildings. Two buildings appear side by side; you pick the better-designed one and each gains/loses an Elo rating, the same system used to rank chess players. Every fifth vote asks one short survey question about *why*.

Built as a companion piece to an NYU Wagner capstone study, *Design Quality in Affordable Housing*, which found that residents are rarely given the design vocabulary or the opportunity to weigh in before a building's design is finalized. This site is a small, public way to practice that vocabulary.

## Stack

React + Vite on the front end, Vercel serverless functions in `api/`, Vercel Postgres (Neon) for storage.

```bash
npm install
npm run dev
```

`npm run dev` serves the `api/` handlers through a Vite middleware, so the full app works locally. With no `POSTGRES_URL` set it runs against [PGlite](https://pglite.dev) — real Postgres compiled to WASM, persisted in `.pglite/` — so no database install is needed to develop. Delete that directory to start from a clean slate.

## Deployment

Auto-deploys to Vercel on push to `main`. Two environment variables:

| Variable | Purpose |
| --- | --- |
| `POSTGRES_URL` | Set automatically when you attach a Vercel Postgres store. Without it, the API falls back to local PGlite, which will **not** persist on serverless. |
| `ADMIN_PASSWORD` | Gates the `/admin` route and all write endpoints. Defaults to a dev-only value if unset. |

The schema in `api/_schema.sql` is applied idempotently on the first query after a cold start, and the building list is seeded once if the table is empty.

## Data

Seeded with real buildings from NYC Open Data's [Affordable Housing Production by Building](https://data.cityofnewyork.us/Housing-Development/Affordable-Housing-Production-by-Building/hg8x-zxpr/about_data) dataset, spanning all five boroughs. Add, edit, or bulk-paste more from the admin panel at `/admin` — it is deliberately not linked in the nav.

Voters are anonymous: each browser generates a UUID kept in `localStorage`, and the `voters` table carries a nullable `user_id` so real accounts can be layered on later without a migration.
