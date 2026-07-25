// POST /api/survey
// { voterId, qid, category, prompt, type, answer, elo?: { winner, loser } }
// Records one survey answer and, for pairwise questions, updates the
// community Elo for the two options.

import { OPTION_K, START_RATING, expected, isUuid, json, readBody, touchVoter, tx } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  let body;
  try { body = await readBody(req); } catch (e) { return json(res, 400, { error: 'Invalid JSON' }); }
  const { voterId, qid, category, prompt, type, answer, elo } = body || {};
  if (!isUuid(voterId)) return json(res, 400, { error: 'voterId must be a UUID' });
  if (!qid || !category || !prompt || !type) return json(res, 400, { error: 'Missing question fields' });
  if (answer === undefined || answer === null || answer === '') return json(res, 400, { error: 'Missing answer' });

  try {
    const out = await tx(async (t) => {
      await touchVoter(t, voterId);

      if (type === 'Neighborhood') {
        await t.query('update voters set neighborhood = $2 where id = $1', [voterId, String(answer).trim()]);
      }
      const v = await t.query('select neighborhood from voters where id = $1', [voterId]);
      const neighborhood = (v[0] && v[0].neighborhood) || null;

      const inserted = await t.query(
        `insert into survey_answers (voter_id, qid, category, prompt, qtype, answer, elo_loser, neighborhood)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (voter_id, qid) do nothing
         returning id`,
        [voterId, qid, category, prompt, type, JSON.stringify(answer), (elo && elo.loser) || null, neighborhood]
      );
      // Already answered — don't double-count it in the Elo pool.
      if (!inserted.length) return { recorded: false, neighborhood };

      if (elo && elo.winner && elo.loser && elo.winner !== elo.loser) {
        for (const label of [elo.winner, elo.loser]) {
          await t.query(
            `insert into option_ratings (category, label, rating) values ($1, $2, $3)
             on conflict (category, label) do nothing`,
            [category, label, START_RATING]
          );
        }
        const rows = await t.query(
          'select label, rating from option_ratings where category = $1 and label in ($2, $3) for update',
          [category, elo.winner, elo.loser]
        );
        const w = Number(rows.find((r) => r.label === elo.winner).rating);
        const l = Number(rows.find((r) => r.label === elo.loser).rating);
        const delta = Math.max(1, Math.round(OPTION_K * (1 - expected(w, l))));
        await t.query(
          'update option_ratings set rating = rating + $3, wins = wins + 1 where category = $1 and label = $2',
          [category, elo.winner, delta]
        );
        await t.query(
          'update option_ratings set rating = rating - $3, losses = losses + 1 where category = $1 and label = $2',
          [category, elo.loser, delta]
        );
      }

      return { recorded: true, neighborhood };
    });
    return json(res, 200, out);
  } catch (e) {
    return json(res, 500, { error: 'Could not record answer', detail: String(e.message || e) });
  }
}
