// GET /api/insights — community-wide aggregates for the Insights page.

import { db, json } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  try {
    const client = await db();

    const [counts] = await client.query(`
      select (select count(*) from votes)::int           as total_votes,
             (select count(*) from survey_answers)::int  as total_answers,
             (select count(*) from buildings)::int       as total_buildings,
             (select count(distinct neighborhood) from voters
               where neighborhood is not null and neighborhood <> '')::int as total_neighborhoods
    `);

    const topBuildings = await client.query(`
      select id, address, neighborhood, rating, wins, losses
        from buildings
       where wins + losses > 0
       order by rating desc
       limit 8
    `);

    const neighborhoods = await client.query(`
      select v.neighborhood as label, count(*)::int as value
        from votes t join voters v on v.id = t.voter_id
       where v.neighborhood is not null and v.neighborhood <> ''
       group by v.neighborhood order by value desc limit 8
    `);

    const optionElo = await client.query(
      'select category, label, rating, wins, losses from option_ratings order by category, rating desc'
    );

    // Answer share per prompt. Multi-selects store a JSON array; wrap scalars
    // into one so both unnest through the same lateral join.
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

    const priorities = await client.query(`
      select prompt,
             avg(case answer #>> '{}'
                   when 'Not Important' then 1
                   when 'Somewhat Important' then 2
                   when 'Very Important' then 3 end)::float as mean,
             count(*)::int as n
        from survey_answers
       where qtype = 'Rating Scale'
       group by prompt order by mean desc
    `);

    const freeText = await client.query(`
      select prompt, answer #>> '{}' as answer, neighborhood, created_at
        from survey_answers
       where qtype = 'Free Text'
       order by created_at desc limit 6
    `);

    return json(res, 200, {
      counts: {
        totalVotes: Number(counts.total_votes),
        totalAnswers: Number(counts.total_answers),
        totalBuildings: Number(counts.total_buildings),
        totalNeighborhoods: Number(counts.total_neighborhoods),
      },
      topBuildings: topBuildings.map((b) => ({ ...b, rating: Number(b.rating) })),
      neighborhoods: neighborhoods.map((r) => ({ label: r.label, value: Number(r.value) })),
      optionElo: optionElo.map((r) => ({ ...r, rating: Number(r.rating) })),
      shares: shares.map((r) => ({ prompt: r.prompt, label: r.label, value: Number(r.value) })),
      priorities: priorities.map((r) => ({ prompt: r.prompt, mean: Number(r.mean), n: Number(r.n) })),
      freeText,
    });
  } catch (e) {
    return json(res, 500, { error: 'Could not load insights', detail: String(e.message || e) });
  }
}
