// POST /api/vote  { voterId, winnerId, loserId }
// Applies one Elo update inside a transaction and returns the result the vote
// screen shows: the rating delta and the share of voters who agreed.

import { K_FACTOR, expected, isUuid, json, readBody, touchVoter, tx } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  let body;
  try { body = await readBody(req); } catch (e) { return json(res, 400, { error: 'Invalid JSON' }); }
  const { voterId, winnerId, loserId } = body || {};
  if (!isUuid(voterId)) return json(res, 400, { error: 'voterId must be a UUID' });
  if (!winnerId || !loserId || winnerId === loserId) return json(res, 400, { error: 'Need two distinct buildings' });

  try {
    const out = await tx(async (t) => {
      await touchVoter(t, voterId);

      // Lock both rows so concurrent votes can't read the same stale ratings.
      const rows = await t.query(
        'select id, rating, wins, losses from buildings where id in ($1, $2) for update',
        [winnerId, loserId]
      );
      const winner = rows.find((r) => r.id === winnerId);
      const loser = rows.find((r) => r.id === loserId);
      if (!winner || !loser) throw Object.assign(new Error('Unknown building'), { status: 404 });

      const p = expected(Number(winner.rating), Number(loser.rating));
      const delta = Math.max(1, Math.round(K_FACTOR * (1 - p)));
      // Elo's expected score is the predicted share of voters picking the
      // winner, so it doubles as the "you agreed with X%" readout.
      const agreed = Math.min(99, Math.max(1, Math.round(p * 100)));

      await t.query('update buildings set rating = rating + $2, wins = wins + 1 where id = $1', [winnerId, delta]);
      await t.query('update buildings set rating = rating - $2, losses = losses + 1 where id = $1', [loserId, delta]);
      await t.query(
        `insert into votes (voter_id, winner_id, loser_id, delta, agreed_pct)
         values ($1, $2, $3, $4, $5)`,
        [voterId, winnerId, loserId, delta, agreed]
      );

      const [{ n: totalVotes }] = await t.query('select count(*)::int as n from votes');
      const [{ n: userVotes }] = await t.query('select count(*)::int as n from votes where voter_id = $1', [voterId]);

      return {
        delta,
        agreed,
        winner: { id: winnerId, rating: Math.round(Number(winner.rating) + delta) },
        loser: { id: loserId, rating: Math.round(Number(loser.rating) - delta) },
        totalVotes: Number(totalVotes),
        userVotes: Number(userVotes),
      };
    });
    return json(res, 200, out);
  } catch (e) {
    return json(res, e.status || 500, { error: 'Vote failed', detail: String(e.message || e) });
  }
}
