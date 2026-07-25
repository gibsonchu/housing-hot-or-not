// GET /api/profile?voterId=<uuid>
// One voter's answers, their own replayed option Elo, and the community shares
// to compare against.

import { OPTION_K, START_RATING, db, expected, isUuid, json } from './_db.js';

/** Replay a voter's pairwise answers into their own private Elo table. */
function replayElo(rows) {
  const ratings = {};
  const rec = {};
  const key = (c, l) => c + '::' + l;
  for (const r of rows) {
    if (!r.elo_loser) continue;
    const winner = typeof r.answer === 'string' ? r.answer : String(r.answer);
    const kw = key(r.category, winner);
    const kl = key(r.category, r.elo_loser);
    if (ratings[kw] == null) ratings[kw] = START_RATING;
    if (ratings[kl] == null) ratings[kl] = START_RATING;
    const delta = Math.max(1, Math.round(OPTION_K * (1 - expected(ratings[kw], ratings[kl]))));
    ratings[kw] += delta;
    ratings[kl] -= delta;
    rec[kw] = rec[kw] || { category: r.category, label: winner, wins: 0, losses: 0 };
    rec[kl] = rec[kl] || { category: r.category, label: r.elo_loser, wins: 0, losses: 0 };
    rec[kw].wins += 1;
    rec[kl].losses += 1;
  }
  return Object.entries(rec)
    .map(([k, v]) => ({ ...v, rating: Math.round(ratings[k]) }))
    .sort((a, b) => b.rating - a.rating);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const voterId = (req.query && req.query.voterId) || new URL(req.url, 'http://x').searchParams.get('voterId');
  if (!isUuid(voterId)) return json(res, 400, { error: 'voterId must be a UUID' });

  try {
    const client = await db();

    const answers = await client.query(
      `select qid, category, prompt, qtype, answer, elo_loser, created_at
         from survey_answers where voter_id = $1 order by created_at`,
      [voterId]
    );
    // The driver already decodes jsonb into JS values.
    const parsed = answers;

    const [{ n: userVotes }] = await client.query(
      'select count(*)::int as n from votes where voter_id = $1', [voterId]
    );
    const voter = await client.query('select neighborhood from voters where id = $1', [voterId]);

    // Community answer share per prompt, for the you-vs-everyone bars.
    const shares = await client.query(`
      select sa.prompt, elem as label, count(*)::int as value
        from survey_answers sa
        cross join lateral jsonb_array_elements_text(
          case when jsonb_typeof(sa.answer) = 'array'
               then sa.answer else jsonb_build_array(sa.answer) end
        ) as elem
       where sa.qtype not in ('Free Text', 'Neighborhood')
       group by sa.prompt, elem
    `);

    return json(res, 200, {
      userVotes: Number(userVotes),
      neighborhood: (voter[0] && voter[0].neighborhood) || '',
      answers: parsed,
      optionElo: replayElo(parsed),
      shares: shares.map((r) => ({ prompt: r.prompt, label: r.label, value: Number(r.value) })),
    });
  } catch (e) {
    return json(res, 500, { error: 'Could not load profile', detail: String(e.message || e) });
  }
}
