// /api/admin — building CRUD, gated by a shared password.
//
// The password check lives here rather than only in the UI, so the data can't
// be edited by anyone who simply skips the client-side screen. Set
// ADMIN_PASSWORD in the Vercel project env; the fallback is for local dev only.

import { START_RATING, db, json, readBody } from './_db.js';

const PASSWORD = process.env.ADMIN_PASSWORD || 'vercel2020';

export default async function handler(req, res) {
  const supplied = req.headers['x-admin-password'];
  if (supplied !== PASSWORD) return json(res, 401, { error: 'Unauthorized' });

  try {
    const client = await db();

    if (req.method === 'GET') {
      const rows = await client.query(
        `select id, address, neighborhood, building_type as type, photo, rating, wins, losses
           from buildings order by created_at, id`
      );
      return json(res, 200, { buildings: rows.map((b) => ({ ...b, rating: Number(b.rating) })) });
    }

    const body = await readBody(req);
    const { action } = body || {};

    if (action === 'create') {
      const list = Array.isArray(body.buildings) ? body.buildings : [body.building];
      const made = [];
      for (const b of list) {
        if (!b || !String(b.address || '').trim()) continue;
        const id = 'b_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
        await client.query(
          `insert into buildings (id, address, neighborhood, building_type, photo, rating)
           values ($1, $2, $3, $4, $5, $6)`,
          [id, String(b.address).trim(), String(b.neighborhood || '').trim(),
           String(b.type || '').trim() || '—', String(b.photo || '').trim(), START_RATING]
        );
        made.push(id);
      }
      return json(res, 200, { created: made.length, ids: made });
    }

    if (action === 'update') {
      const b = body.building || {};
      if (!b.id) return json(res, 400, { error: 'Missing id' });
      await client.query(
        `update buildings set address = $2, neighborhood = $3, building_type = $4, photo = $5
           where id = $1`,
        [b.id, String(b.address || '').trim(), String(b.neighborhood || '').trim(),
         String(b.type || '').trim() || '—', String(b.photo || '').trim()]
      );
      return json(res, 200, { updated: b.id });
    }

    if (action === 'delete') {
      if (!body.id) return json(res, 400, { error: 'Missing id' });
      await client.query('delete from buildings where id = $1', [body.id]);
      return json(res, 200, { deleted: body.id });
    }

    // Clears every trace of participation so a real study can start from zero.
    // Survey answers go too — leaving them would strand answer counts on the
    // Insights page with no votes or option ratings behind them.
    if (action === 'resetElo') {
      await client.query('update buildings set rating = $1, wins = 0, losses = 0', [START_RATING]);
      await client.query('delete from votes');
      await client.query('delete from option_ratings');
      await client.query('delete from survey_answers');
      await client.query('update voters set neighborhood = null');
      return json(res, 200, { reset: true });
    }

    if (action === 'verify') return json(res, 200, { ok: true });

    return json(res, 400, { error: 'Unknown action' });
  } catch (e) {
    return json(res, 500, { error: 'Admin request failed', detail: String(e.message || e) });
  }
}
