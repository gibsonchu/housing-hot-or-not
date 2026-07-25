import { useEffect, useState } from 'react';
import { Bars, Compare, Empty, Section, Stat } from './Charts';
import { QUESTIONS } from './surveyBank';
import { getProfile } from './api';

const ink = '#111';
const gray = '#767676';
const line = '#e0e0e0';
const serif = "Georgia,'Times New Roman',Times,serif";

const subjectOf = (prompt) => prompt.replace(/^How important is\s+/, '').replace(/\?$/, '');
const asList = (a) => (Array.isArray(a) ? a : [a]);

/** A short label for how this person votes, derived from their own answers. */
function archetype(answers) {
  const pick = (prompt) => {
    const r = [...answers].reverse().find((x) => x.prompt === prompt);
    return r ? asList(r.answer)[0] : null;
  };
  const style = pick('Which style do you generally prefer?');
  const scale = pick('Which scale feels best?');
  const tradeoff = pick('Would you rather have...');
  const feature = pick('Which feature mattered most?');

  const name =
    style === 'Traditional' ? 'The Contextualist'
    : style === 'Modern' ? 'The Modernist'
    : feature === 'Ground floor' ? 'The Street-Level Realist'
    : feature === 'Materials' ? 'The Materialist'
    : tradeoff === 'More homes' ? 'The Supply-First Pragmatist'
    : tradeoff === 'Better design' ? 'The Design Advocate'
    : 'The Balanced Judge';

  const bits = [];
  if (style) bits.push(style.toLowerCase() + ' leaning');
  if (scale) bits.push('drawn to ' + scale.toLowerCase() + ' buildings');
  if (feature) bits.push('decides on ' + feature.toLowerCase());
  if (tradeoff) bits.push(tradeoff.toLowerCase() === 'both equally' ? 'weighs homes and design equally' : 'prioritizes ' + tradeoff.toLowerCase());

  return { name, blurb: bits.length ? bits.join(' · ') : 'Answer a few more surveys to sharpen this.' };
}

const ComparePrompt = ({ data, prompt, title, note }) => {
  const q = QUESTIONS.find((x) => x.prompt === prompt);
  if (!q) return null;

  const mine = data.answers.filter((r) => r.prompt === prompt);
  if (!mine.length) return null;
  const yourCounts = {};
  let yourTotal = 0;
  for (const r of mine) for (const a of asList(r.answer)) { yourCounts[a] = (yourCounts[a] || 0) + 1; yourTotal += 1; }

  const all = data.shares.filter((s) => s.prompt === prompt);
  const allTotal = all.reduce((a, r) => a + r.value, 0);
  const allMap = Object.fromEntries(all.map((r) => [r.label, r.value]));

  return (
    <Section title={title} note={note}>
      <Compare rows={q.options.map((o) => ({
        label: o,
        you: yourTotal ? Math.round((100 * (yourCounts[o] || 0)) / yourTotal) : 0,
        all: allTotal ? Math.round((100 * (allMap[o] || 0)) / allTotal) : 0,
      }))} />
    </Section>
  );
};

export default function Profile({ userVotes, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    getProfile()
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, []);

  const backBtn = (
    <button onClick={onBack} className="btn-soft" style={{ background: '#fff', color: ink, border: `1px solid ${line}`, padding: '9px 18px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>&larr; Back to voting</button>
  );
  const shell = (children) => (
    <div style={{ flex: 1, padding: '40px 28px 72px', maxWidth: 820, margin: '0 auto', width: '100%' }}>
      {backBtn}
      {children}
    </div>
  );

  if (error) return shell(<div style={{ marginTop: 30 }}><Empty>Couldn&rsquo;t load your profile — {error}.</Empty></div>);
  if (!data) return shell(<div style={{ marginTop: 30, fontSize: 14, color: gray }}>Loading…</div>);

  const a = archetype(data.answers);
  const eloRows = (category) => data.optionElo
    .filter((r) => r.category === category)
    .slice(0, 5)
    .map((r) => ({ label: r.label, value: r.rating }));
  const materials = eloRows('Materials');
  const ground = eloRows('Ground Floor');

  const weight = { 'Not Important': 1, 'Somewhat Important': 2, 'Very Important': 3 };
  const priorities = data.answers
    .filter((r) => r.qtype === 'Rating Scale')
    .map((r) => ({ label: subjectOf(r.prompt), value: weight[r.answer] || 0 }))
    .sort((x, y) => y.value - x.value);

  const influences = (() => {
    const counts = {};
    for (const r of data.answers.filter((x) => x.prompt === 'What influenced your choice?')) {
      for (const o of asList(r.answer)) counts[o] = (counts[o] || 0) + 1;
    }
    return Object.entries(counts).sort((x, y) => y[1] - x[1]).slice(0, 6).map(([label, value]) => ({ label, value }));
  })();

  return shell(
    <>
      <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: gray, marginTop: 30 }}>Your design profile</div>
      <h1 style={{ fontFamily: serif, fontSize: 'clamp(32px,4.4vw,46px)', fontWeight: 600, letterSpacing: '-0.02em', color: ink, margin: '8px 0 0', lineHeight: 1.1 }}>{a.name}</h1>
      <div style={{ fontSize: 15, color: gray, marginTop: 10, lineHeight: 1.6 }}>{a.blurb}</div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 26 }}>
        <Stat value={(data.userVotes || userVotes).toLocaleString()} label="Votes cast" />
        <Stat value={data.answers.length.toLocaleString()} label="Questions answered" />
        <Stat value={data.neighborhood || '—'} label="Your neighborhood" />
      </div>

      <Section title="What actually drives your votes" note="How often each factor showed up when you explained a choice.">
        {influences.length ? <Bars rows={influences} /> : <Empty>Answer &ldquo;What influenced your choice?&rdquo; a few times to fill this in.</Empty>}
      </Section>

      <Section title="Your material ranking" note="Your own head-to-head facade preferences, replayed as Elo ratings.">
        {materials.length ? <Bars rows={materials} max={Math.max(...materials.map((r) => r.value)) + 40} /> : <Empty>No facade matchups answered yet.</Empty>}
      </Section>

      <Section title="Your street level" note="What you'd rather have at the base of a building.">
        {ground.length ? <Bars rows={ground} max={Math.max(...ground.map((r) => r.value)) + 40} /> : <Empty>No ground-floor matchups answered yet.</Empty>}
      </Section>

      <Section title="Your priorities" note="How important you said each one is, from 1 (not important) to 3 (very important).">
        {priorities.length ? <Bars rows={priorities} max={3} format={(v) => v.toFixed(0)} /> : <Empty>No priority ratings yet.</Empty>}
      </Section>

      <ComparePrompt data={data} prompt="Which style do you generally prefer?" title="Style, you vs everyone" note="Your answers against every response collected across all voters." />
      <ComparePrompt data={data} prompt="Which scale feels best?" title="Scale, you vs everyone" />
      <ComparePrompt data={data} prompt="Would you rather have..." title="Homes vs design, you vs everyone" />
      <ComparePrompt data={data} prompt="Which feature mattered most?" title="Deciding feature, you vs everyone" />
    </>
  );
}
