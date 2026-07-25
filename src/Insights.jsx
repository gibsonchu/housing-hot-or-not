import { useEffect, useState } from 'react';
import { Bars, Empty, Section, Stat } from './Charts';
import { getInsights } from './api';

const ink = '#111';
const gray = '#767676';
const line = '#e0e0e0';
const serif = "Georgia,'Times New Roman',Times,serif";

const subjectOf = (prompt) => prompt.replace(/^How important is\s+/, '').replace(/\?$/, '');

/** Answer shares for one prompt, as percentages of that prompt's responses. */
function shareRows(shares, prompt) {
  const rows = shares.filter((s) => s.prompt === prompt);
  const total = rows.reduce((a, r) => a + r.value, 0);
  if (!total) return null;
  return rows
    .map((r) => ({ label: r.label, value: Math.round((100 * r.value) / total) }))
    .sort((a, b) => b.value - a.value);
}

const eloRows = (optionElo, category) =>
  optionElo
    .filter((r) => r.category === category)
    .map((r) => ({ label: r.label, value: Math.round(r.rating), caption: `${r.wins}–${r.losses}` }));

const EloSection = ({ optionElo, category, title, note }) => {
  const rows = eloRows(optionElo, category);
  return (
    <Section title={title} note={note}>
      {rows.length ? <Bars rows={rows} max={Math.max(...rows.map((r) => r.value)) + 40} /> : <Empty>No head-to-head answers yet.</Empty>}
    </Section>
  );
};

const ShareSection = ({ shares, prompt, title, note }) => {
  const rows = shareRows(shares, prompt);
  return (
    <Section title={title} note={note}>
      {rows ? <Bars rows={rows} max={100} format={(v) => v + '%'} /> : <Empty>Not enough responses yet.</Empty>}
    </Section>
  );
};

export default function Insights() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    getInsights()
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, []);

  const wrap = (children) => (
    <div style={{ flex: 1, padding: '40px 28px 72px', maxWidth: 880, margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontFamily: serif, fontSize: 'clamp(30px,4vw,42px)', fontWeight: 600, letterSpacing: '-0.02em', color: ink, margin: 0 }}>Insights</h1>
      <div style={{ fontSize: 15, color: gray, marginTop: 8, lineHeight: 1.6 }}>
        What the votes and survey answers add up to — which buildings win, which materials hold up, and what people say they want on the street.
      </div>
      {children}
    </div>
  );

  if (error) return wrap(<div style={{ marginTop: 30 }}><Empty>Couldn&rsquo;t load insights — {error}.</Empty></div>);
  if (!data) return wrap(<div style={{ marginTop: 30, fontSize: 14, color: gray }}>Loading…</div>);

  const topBuildings = data.topBuildings.map((b) => ({
    label: b.address, value: Math.round(b.rating), caption: b.neighborhood,
  }));
  const priorities = data.priorities.map((p) => ({
    label: subjectOf(p.prompt), value: Math.round(p.mean * 100) / 100,
  }));

  return wrap(
    <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 26 }}>
        <Stat value={data.counts.totalVotes.toLocaleString()} label="Building votes" />
        <Stat value={data.counts.totalAnswers.toLocaleString()} label="Survey answers" />
        <Stat value={data.counts.totalNeighborhoods || '—'} label="Neighborhoods" />
        <Stat value={data.counts.totalBuildings} label="Buildings in play" />
      </div>

      <Section title="Most preferred buildings" note="Elo rating from head-to-head votes. Only buildings that have appeared at least once.">
        {topBuildings.length ? <Bars rows={topBuildings} max={Math.max(...topBuildings.map((r) => r.value)) + 60} /> : <Empty>No votes cast yet.</Empty>}
      </Section>

      <Section title="Neighborhood trends" note="Where voters say they live, by number of votes cast.">
        {data.neighborhoods.length ? <Bars rows={data.neighborhoods} /> : <Empty>No one has told us their neighborhood yet.</Empty>}
      </Section>

      <EloSection optionElo={data.optionElo} category="Materials" title="Highest-rated materials" note="Facade materials ranked by head-to-head Elo. 1400 is the starting rating." />
      <EloSection optionElo={data.optionElo} category="Window Styles" title="Preferred window styles" note="From small punched openings to full floor-to-ceiling glass." />
      <EloSection optionElo={data.optionElo} category="Ground Floor" title="Ground floor preferences" note="What people would rather walk past at street level." />

      <ShareSection shares={data.shares} prompt="Which scale feels best?" title="Height preferences" note="Share of respondents choosing each building scale." />
      <ShareSection shares={data.shares} prompt="Which feature mattered most?" title="What decides a vote" note="The single feature people say mattered most in a head-to-head." />
      <ShareSection shares={data.shares} prompt="Would you rather have..." title="More homes or better design" note="The central tradeoff in the affordable housing debate." />
      <ShareSection shares={data.shares} prompt="Would you support a taller building if it meant more affordable homes?" title="Height for affordability" note="Willingness to trade building height for more affordable units." />

      <Section title="Design priorities" note="Mean importance, from 1 (not important) to 3 (very important).">
        {priorities.length ? <Bars rows={priorities} max={3} format={(v) => v.toFixed(2)} /> : <Empty>No priority ratings yet.</Empty>}
      </Section>

      <Section title="In their own words" note="Recent open responses.">
        {data.freeText.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {data.freeText.map((r, i) => (
              <blockquote key={i} style={{ margin: 0, borderLeft: `2px solid ${line}`, padding: '2px 0 2px 16px' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: gray }}>{r.prompt}</div>
                <div style={{ fontFamily: serif, fontSize: 16, color: ink, marginTop: 5, lineHeight: 1.5 }}>&ldquo;{r.answer}&rdquo;</div>
                {r.neighborhood && <div style={{ fontSize: 12, color: gray, marginTop: 4 }}>— {r.neighborhood}</div>}
              </blockquote>
            ))}
          </div>
        ) : <Empty>No written responses yet.</Empty>}
      </Section>
    </>
  );
}
