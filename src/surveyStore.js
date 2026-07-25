// Survey response storage: option-level Elo for pairwise questions, tallies for
// everything else. Same shape as the building store — browser-local, no backend.

export const SURVEY_STORE = 'hhon_survey_v1';
export const SURVEY_K = 24;
export const OPTION_START = 1400;

export const emptySurvey = () => ({
  responses: [],   // { qid, category, prompt, type, answer, ts }
  elo: {},         // "Category::Option" -> { rating, wins, losses }
  tallies: {},     // "Category::Prompt::Option" -> count
  neighborhood: '',
  asked: 0,        // how many surveys have been shown
});

export function loadSurvey() {
  try {
    const d = JSON.parse(localStorage.getItem(SURVEY_STORE));
    if (d && typeof d === 'object') return { ...emptySurvey(), ...d };
  } catch (e) {}
  return emptySurvey();
}

export function saveSurvey(s) {
  try { localStorage.setItem(SURVEY_STORE, JSON.stringify(s)); } catch (e) {}
}

const eloKey = (cat, opt) => cat + '::' + opt;
const tallyKey = (cat, prompt, opt) => cat + '::' + prompt + '::' + opt;

export const getElo = (s, cat, opt) => (s.elo[eloKey(cat, opt)] || { rating: OPTION_START, wins: 0, losses: 0 });
export const getTally = (s, cat, prompt, opt) => s.tallies[tallyKey(cat, prompt, opt)] || 0;

const expected = (a, b) => 1 / (1 + Math.pow(10, (b - a) / 400));

/** All options in a category that have an Elo record, best first. */
export function eloBoard(s, category) {
  return Object.entries(s.elo)
    .filter(([k]) => k.split('::')[0] === category)
    .map(([k, v]) => ({ option: k.split('::')[1], ...v, games: v.wins + v.losses }))
    .sort((a, b) => b.rating - a.rating);
}

/** Distribution of answers to one prompt, as {option, count, pct}, biggest first. */
export function distribution(s, category, prompt, options) {
  const rows = options.map((o) => ({ option: o, count: getTally(s, category, prompt, o) }));
  const total = rows.reduce((a, r) => a + r.count, 0);
  return {
    total,
    rows: rows.map((r) => ({ ...r, pct: total ? Math.round((100 * r.count) / total) : 0 }))
      .sort((a, b) => b.count - a.count),
  };
}

/**
 * Record one answer. `answer` is a string, or an array for Multi-select.
 * Returns the next survey state (does not mutate).
 */
export function recordAnswer(state, q, answer) {
  const s = {
    ...state,
    responses: [...state.responses],
    elo: { ...state.elo },
    tallies: { ...state.tallies },
  };
  const chosen = Array.isArray(answer) ? answer : [answer];

  if (q.type === 'Neighborhood') {
    s.neighborhood = String(answer || '').trim();
  }

  // Elo only for pairwise questions with a stable, category-wide option set.
  if (q.elo && chosen.length === 1) {
    const winner = chosen[0];
    const loser = q.options.find((o) => o !== winner);
    if (loser) {
      const w = getElo(s, q.category, winner);
      const l = getElo(s, q.category, loser);
      const delta = Math.max(1, Math.round(SURVEY_K * (1 - expected(w.rating, l.rating))));
      s.elo[eloKey(q.category, winner)] = { rating: w.rating + delta, wins: w.wins + 1, losses: w.losses };
      s.elo[eloKey(q.category, loser)] = { rating: l.rating - delta, wins: l.wins, losses: l.losses + 1 };
    }
  }

  if (q.type !== 'Free Text' && q.type !== 'Neighborhood') {
    for (const o of chosen) {
      const k = tallyKey(q.category, q.prompt, o);
      s.tallies[k] = (s.tallies[k] || 0) + 1;
    }
  }

  s.responses.push({
    qid: q.id, category: q.category, prompt: q.prompt, type: q.type,
    answer, neighborhood: s.neighborhood, ts: Date.now(),
  });
  return s;
}
