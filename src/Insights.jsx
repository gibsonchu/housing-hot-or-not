import { Bars, Empty, Section, Stat } from './Charts';
import { QUESTIONS } from './surveyBank';
import { distribution, eloBoard } from './surveyStore';

const ink = '#111';
const gray = '#767676';
const line = '#e0e0e0';
const serif = "Georgia,'Times New Roman',Times,serif";

const eloRows = (s, category) =>
  eloBoard(s, category).map((r) => ({ label: r.option, value: Math.round(r.rating), caption: `${r.wins}–${r.losses}` }));

/** Bars for the first bank question matching a prompt, by answer share. */
function promptRows(s, prompt) {
  const q = QUESTIONS.find((x) => x.prompt === prompt);
  if (!q) return null;
  const d = distribution(s, q.category, q.prompt, q.options);
  if (!d.total) return null;
  return d.rows.map((r) => ({ label: r.option, value: r.pct }));
}

const EloSection = ({ survey, category, title, note }) => {
  const rows = eloRows(survey, category);
  return (
    <Section title={title} note={note}>
      {rows.length ? <Bars rows={rows} max={Math.max(...rows.map((r) => r.value)) + 40} /> : <Empty>No head-to-head answers yet.</Empty>}
    </Section>
  );
};

const ShareSection = ({ survey, prompt, title, note }) => {
  const rows = promptRows(survey, prompt);
  return (
    <Section title={title} note={note}>
      {rows ? <Bars rows={rows} max={100} format={(v) => v + '%'} /> : <Empty>Not enough responses yet.</Empty>}
    </Section>
  );
};

export default function Insights({ survey, buildings, totalVotes }) {
  const topBuildings = [...buildings]
    .filter((b) => (b.wins || 0) + (b.losses || 0) > 0)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 8)
    .map((b) => ({ label: b.address, value: Math.round(b.rating), caption: b.neighborhood }));

  // Which neighborhoods do respondents come from?
  const hoodCounts = {};
  for (const r of survey.responses) {
    if (r.neighborhood) hoodCounts[r.neighborhood] = (hoodCounts[r.neighborhood] || 0) + 1;
  }
  const hoodRows = Object.entries(hoodCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([label, value]) => ({ label, value }));

  // Design priorities: mean score, 1 (Not) to 3 (Very).
  const priority = QUESTIONS.filter((q) => q.category === 'Design Priorities').map((q) => {
    const d = distribution(survey, q.category, q.prompt, q.options);
    if (!d.total) return null;
    const weight = { 'Not Important': 1, 'Somewhat Important': 2, 'Very Important': 3 };
    const mean = d.rows.reduce((a, r) => a + weight[r.option] * r.count, 0) / d.total;
    return { label: q.subject, value: Math.round(mean * 100) / 100 };
  }).filter(Boolean).sort((a, b) => b.value - a.value);

  const freeText = survey.responses.filter((r) => r.type === 'Free Text').slice(-6).reverse();

  return (
    <div style={{ flex: 1, padding: '40px 28px 72px', maxWidth: 880, margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontFamily: serif, fontSize: 'clamp(30px,4vw,42px)', fontWeight: 600, letterSpacing: '-0.02em', color: ink, margin: 0 }}>Insights</h1>
      <div style={{ fontSize: 15, color: gray, marginTop: 8, lineHeight: 1.6 }}>
        What the votes and survey answers add up to — which buildings win, which materials hold up, and what people say they want on the street.
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 26 }}>
        <Stat value={totalVotes.toLocaleString()} label="Building votes" />
        <Stat value={survey.responses.length.toLocaleString()} label="Survey answers" />
        <Stat value={Object.keys(hoodCounts).length || '—'} label="Neighborhoods" />
        <Stat value={buildings.length} label="Buildings in play" />
      </div>

      <Section title="Most preferred buildings" note="Elo rating from head-to-head votes. Only buildings that have appeared at least once.">
        {topBuildings.length ? <Bars rows={topBuildings} max={Math.max(...topBuildings.map((r) => r.value)) + 60} /> : <Empty>No votes cast yet.</Empty>}
      </Section>

      <Section title="Neighborhood trends" note="Where respondents say they live.">
        {hoodRows.length ? <Bars rows={hoodRows} /> : <Empty>No one has told us their neighborhood yet.</Empty>}
      </Section>

      <EloSection survey={survey} category="Materials" title="Highest-rated materials" note="Facade materials ranked by head-to-head Elo. 1400 is the starting rating." />
      <EloSection survey={survey} category="Window Styles" title="Preferred window styles" note="From small punched openings to full floor-to-ceiling glass." />
      <EloSection survey={survey} category="Ground Floor" title="Ground floor preferences" note="What people would rather walk past at street level." />

      <ShareSection survey={survey} prompt="Which scale feels best?" title="Height preferences" note="Share of respondents choosing each building scale." />
      <ShareSection survey={survey} prompt="Which feature mattered most?" title="What decides a vote" note="The single feature people say mattered most in a head-to-head." />
      <ShareSection survey={survey} prompt="Would you rather have..." title="More homes or better design" note="The central tradeoff in the affordable housing debate." />
      <ShareSection survey={survey} prompt="Would you support a taller building if it meant more affordable homes?" title="Height for affordability" note="Willingness to trade building height for more affordable units." />

      <Section title="Design priorities" note="Mean importance, from 1 (not important) to 3 (very important).">
        {priority.length ? <Bars rows={priority} max={3} format={(v) => v.toFixed(2)} /> : <Empty>No priority ratings yet.</Empty>}
      </Section>

      <Section title="In their own words" note="Recent open responses.">
        {freeText.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {freeText.map((r, i) => (
              <blockquote key={i} style={{ margin: 0, borderLeft: `2px solid ${line}`, padding: '2px 0 2px 16px' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: gray }}>{r.prompt}</div>
                <div style={{ fontFamily: serif, fontSize: 16, color: ink, marginTop: 5, lineHeight: 1.5 }}>&ldquo;{r.answer}&rdquo;</div>
                {r.neighborhood && <div style={{ fontSize: 12, color: gray, marginTop: 4 }}>— {r.neighborhood}</div>}
              </blockquote>
            ))}
          </div>
        ) : <Empty>No written responses yet.</Empty>}
      </Section>

      <div style={{ marginTop: 44, borderTop: `1px solid ${line}`, paddingTop: 16, fontSize: 12, color: gray, lineHeight: 1.6 }}>
        Facade Off has no backend yet, so &ldquo;everyone&rdquo; means every vote and answer recorded in this browser. Once responses are pooled server-side, these charts will show the citywide picture.
      </div>
    </div>
  );
}
