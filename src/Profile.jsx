import { Bars, Compare, Empty, Section, Stat } from './Charts';
import { QUESTIONS } from './surveyBank';
import { distribution, eloBoard } from './surveyStore';

const ink = '#111';
const gray = '#767676';
const line = '#e0e0e0';
const serif = "Georgia,'Times New Roman',Times,serif";

/** Share of this user's own answers to a prompt, per option. */
function yourShare(responses, prompt, options) {
  const mine = responses.filter((r) => r.prompt === prompt);
  const counts = {};
  let total = 0;
  for (const r of mine) {
    for (const a of Array.isArray(r.answer) ? r.answer : [r.answer]) {
      counts[a] = (counts[a] || 0) + 1;
      total += 1;
    }
  }
  return { total, pct: (o) => (total ? Math.round((100 * (counts[o] || 0)) / total) : 0) };
}

const ComparePrompt = ({ survey, prompt, title, note }) => {
  const q = QUESTIONS.find((x) => x.prompt === prompt);
  if (!q) return null;
  const you = yourShare(survey.responses, prompt, q.options);
  const all = distribution(survey, q.category, q.prompt, q.options);
  if (!you.total) return null;
  const map = Object.fromEntries(all.rows.map((r) => [r.option, r.pct]));
  return (
    <Section title={title} note={note}>
      <Compare rows={q.options.map((o) => ({ label: o, you: you.pct(o), all: map[o] || 0 }))} />
    </Section>
  );
};

/** A short label for how this person votes, derived from their own answers. */
function archetype(survey) {
  const pick = (prompt) => {
    const r = [...survey.responses].reverse().find((x) => x.prompt === prompt);
    return r ? (Array.isArray(r.answer) ? r.answer[0] : r.answer) : null;
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

export default function Profile({ survey, userVotes, onBack }) {
  const a = archetype(survey);
  const materials = eloBoard(survey, 'Materials').slice(0, 5).map((r) => ({ label: r.option, value: Math.round(r.rating) }));
  const ground = eloBoard(survey, 'Ground Floor').slice(0, 5).map((r) => ({ label: r.option, value: Math.round(r.rating) }));

  const priorities = QUESTIONS.filter((q) => q.category === 'Design Priorities').map((q) => {
    const mine = survey.responses.filter((r) => r.prompt === q.prompt);
    if (!mine.length) return null;
    const weight = { 'Not Important': 1, 'Somewhat Important': 2, 'Very Important': 3 };
    const mean = mine.reduce((s, r) => s + (weight[r.answer] || 0), 0) / mine.length;
    return { label: q.subject, value: Math.round(mean * 100) / 100 };
  }).filter(Boolean).sort((a2, b2) => b2.value - a2.value);

  const influences = (() => {
    const q = QUESTIONS.find((x) => x.prompt === 'What influenced your choice?');
    const counts = {};
    for (const r of survey.responses.filter((r2) => r2.prompt === q.prompt)) {
      for (const o of Array.isArray(r.answer) ? r.answer : [r.answer]) counts[o] = (counts[o] || 0) + 1;
    }
    return Object.entries(counts).sort((x, y) => y[1] - x[1]).slice(0, 6).map(([label, value]) => ({ label, value }));
  })();

  return (
    <div style={{ flex: 1, padding: '40px 28px 72px', maxWidth: 820, margin: '0 auto', width: '100%' }}>
      <button onClick={onBack} className="btn-soft" style={{ background: '#fff', color: ink, border: `1px solid ${line}`, padding: '9px 18px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>&larr; Back to voting</button>

      <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: gray, marginTop: 30 }}>Your design profile</div>
      <h1 style={{ fontFamily: serif, fontSize: 'clamp(32px,4.4vw,46px)', fontWeight: 600, letterSpacing: '-0.02em', color: ink, margin: '8px 0 0', lineHeight: 1.1 }}>{a.name}</h1>
      <div style={{ fontSize: 15, color: gray, marginTop: 10, lineHeight: 1.6 }}>{a.blurb}</div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 26 }}>
        <Stat value={userVotes.toLocaleString()} label="Votes cast" />
        <Stat value={survey.responses.length.toLocaleString()} label="Questions answered" />
        <Stat value={survey.neighborhood || '—'} label="Your neighborhood" />
      </div>

      <Section title="What actually drives your votes" note="How often each factor showed up when you explained a choice.">
        {influences.length ? <Bars rows={influences} /> : <Empty>Answer &ldquo;What influenced your choice?&rdquo; a few times to fill this in.</Empty>}
      </Section>

      <Section title="Your material ranking" note="Your own head-to-head facade preferences, as Elo ratings.">
        {materials.length ? <Bars rows={materials} max={Math.max(...materials.map((r) => r.value)) + 40} /> : <Empty>No facade matchups answered yet.</Empty>}
      </Section>

      <Section title="Your street level" note="What you'd rather have at the base of a building.">
        {ground.length ? <Bars rows={ground} max={Math.max(...ground.map((r) => r.value)) + 40} /> : <Empty>No ground-floor matchups answered yet.</Empty>}
      </Section>

      <Section title="Your priorities" note="Mean importance you gave each, from 1 (not important) to 3 (very important).">
        {priorities.length ? <Bars rows={priorities} max={3} format={(v) => v.toFixed(2)} /> : <Empty>No priority ratings yet.</Empty>}
      </Section>

      <ComparePrompt survey={survey} prompt="Which style do you generally prefer?" title="Style, you vs everyone" note="Your answers against every response collected." />
      <ComparePrompt survey={survey} prompt="Which scale feels best?" title="Scale, you vs everyone" />
      <ComparePrompt survey={survey} prompt="Would you rather have..." title="Homes vs design, you vs everyone" />
      <ComparePrompt survey={survey} prompt="Which feature mattered most?" title="Deciding feature, you vs everyone" />

      <div style={{ marginTop: 44, borderTop: `1px solid ${line}`, paddingTop: 16, fontSize: 12, color: gray, lineHeight: 1.6 }}>
        Everything here is computed in your browser. Until responses are pooled server-side, the &ldquo;everyone&rdquo; column reflects all answers recorded on this device, so it will closely track your own.
      </div>
    </div>
  );
}
