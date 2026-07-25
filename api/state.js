// GET /api/state?voterId=<uuid>
// Everything the vote screen needs on load: the building set, community totals,
// and what this voter has already done.

import { db, isUuid, json, touchVoter } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const voterId = (req.query && req.query.voterId) || new URL(req.url, 'http://x').searchParams.get('voterId');

  try {
    const client = await db();
    if (isUuid(voterId)) await touchVoter(client, voterId);

    const buildings = await client.query(
      `select id, address, neighborhood, building_type as type, photo,
              rating, wins, losses
         from buildings order by created_at, id`
    );
    const [{ n: totalVotes }] = await client.query('select count(*)::int as n from votes');

    let userVotes = 0;
    let answeredQids = [];
    let neighborhood = '';
    if (isUuid(voterId)) {
      const [{ n }] = await client.query('select count(*)::int as n from votes where voter_id = $1', [voterId]);
      userVotes = Number(n);
      const rows = await client.query('select qid from survey_answers where voter_id = $1', [voterId]);
      answeredQids = rows.map((r) => r.qid);
      const v = await client.query('select neighborhood from voters where id = $1', [voterId]);
      neighborhood = (v[0] && v[0].neighborhood) || '';
    }

    return json(res, 200, {
      buildings: buildings.map((b) => ({ ...b, rating: Number(b.rating) })),
      totalVotes: Number(totalVotes),
      userVotes,
      answeredQids,
      neighborhood,
    });
  } catch (e) {
    return json(res, 500, { error: 'Could not load state', detail: String(e.message || e) });
  }
}
