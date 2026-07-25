import { useEffect, useRef, useState } from 'react';
import Photo from './Photo';
import SurveyModal from './SurveyModal';
import Insights from './Insights';
import Profile from './Profile';
import { NEIGHBORHOOD_QUESTION, pickQuestion } from './surveyBank';
import { loadSurvey, recordAnswer, saveSurvey } from './surveyStore';
import './App.css';

const STORE = 'hhon_nyc_v2';
const USER_VOTES_STORE = 'hhon_user_votes_v1';
const K_FACTOR = 32;
const START_RATING = 1400;
const PROFILE_AT = 50;       // votes needed to unlock the design profile
const PROFILE_TEASE_AT = 5;  // votes before we start showing the countdown
const SURVEY_EVERY = 5;      // ask a survey question this often

// Editorial palette — NYT data-viz register: ink on white, no accent color.
const ink = '#111';
const gray = '#767676';
const line = '#e0e0e0';
const subtle = '#f9f9f9';
const green = '#111';       // alias: primary interactive → ink
const greenDeep = '#111';
const highlight = '#111';
const mint = '#fff';
const serif = "Georgia,'Times New Roman',Times,serif";
const sans = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const cardShadow = 'none';
const typeLine = (n, t) => (t && t !== '—' ? n + '  ·  ' + t : n);

const aboutH2 = { fontFamily: serif, fontSize: 22, fontWeight: 600, margin: '38px 0 12px', color: ink, lineHeight: 1.25 };
const aboutP = { margin: '0 0 18px' };
const aboutUl = { margin: '0 0 18px', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6 };

// Source: NYC Open Data, "Affordable Housing Production by Building"
// https://data.cityofnewyork.us/Housing-Development/Affordable-Housing-Production-by-Building/hg8x-zxpr
function seed() {
  const list = [
    ['747 Thomas Boyland Street', 'Brownsville · Brooklyn', 'Mid-Rise'],
    ['1640 Flatbush Avenue', 'Flatbush · Brooklyn', 'Tower'],
    ['123 Grand Street', 'Greenpoint · Brooklyn', 'Mid-Rise'],
    ['268 Sullivan Place', 'Crown Heights · Brooklyn', 'Low-Rise'],
    ['1644 New York Avenue', 'East Flatbush · Brooklyn', 'Low-Rise'],
    ['180 Pennsylvania Avenue', 'East New York · Brooklyn', 'Mid-Rise'],
    ['2216 Aqueduct Avenue East', 'Fordham · Bronx', 'Low-Rise'],
    ['683 Tinton Avenue', 'Mott Haven · Bronx', 'Tower'],
    ['2495 Sedgwick Avenue', 'Kingsbridge · Bronx', 'Tower'],
    ['4523 White Plains Road', 'Williamsbridge · Bronx', 'Tower'],
    ['978 Summit Avenue', 'Concourse · Bronx', 'Mid-Rise'],
    ['2769 Creston Avenue', 'Kingsbridge · Bronx', 'Mid-Rise'],
    ['1440 Amsterdam Avenue', 'Morningside Heights · Manhattan', 'Tower Complex'],
    ['101 Macombs Place', 'Central Harlem · Manhattan', 'Low-Rise'],
    ['336 East 112 Street', 'East Harlem · Manhattan', 'Low-Rise'],
    ['25 Water Street', 'Financial District · Manhattan', 'Tower Complex'],
    ['183 Chrystie Street', 'Lower East Side · Manhattan', 'Mid-Rise'],
    ['38-38 32 Street', 'Astoria · Queens', 'Mid-Rise'],
    ['83-07 Queens Boulevard', 'Elmhurst · Queens', 'Mid-Rise'],
    ['1605 Village Lane', 'Far Rockaway · Queens', 'Tower'],
    ['188-11 Hillside Avenue', 'Jamaica Estates · Queens', 'Tower'],
    ['97-04 Sutphin Boulevard', 'Jamaica · Queens', 'Tower'],
    ['5 Stuyvesant Place', 'St. George · Staten Island', 'Mid-Rise'],
  ];
  return list.map((x, i) => ({
    id: 'seed' + i, address: x[0], neighborhood: x[1], type: x[2],
    photo: '', rating: START_RATING, wins: 0, losses: 0,
  }));
}

function persist(list) {
  try { localStorage.setItem(STORE, JSON.stringify(list)); } catch (e) {}
}

function expected(a, b) { return 1 / (1 + Math.pow(10, (b - a) / 400)); }

const emptyForm = { address: '', neighborhood: '', type: '', photo: '' };

const ADMIN_PASSWORD = 'vercel2020';
const ADMIN_UNLOCK = 'hhon_admin_unlocked';

export default function App() {
  // Admin lives at /admin only — it is not in the nav.
  const [screen, setScreen] = useState(() =>
    (typeof location !== 'undefined' && location.pathname.replace(/\/+$/, '') === '/admin') ? 'admin' : 'vote');
  const [adminOk, setAdminOk] = useState(() => {
    try { return sessionStorage.getItem(ADMIN_UNLOCK) === '1'; } catch (e) { return false; }
  });
  const [adminPw, setAdminPw] = useState('');
  const [adminErr, setAdminErr] = useState(false);
  const [buildings, setBuildings] = useState([]);
  const [pair, setPair] = useState(null);
  const [flash, setFlash] = useState(null);
  const [flashDelta, setFlashDelta] = useState(0);
  const [detailId, setDetailId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [bulk, setBulk] = useState('');
  const [copied, setCopied] = useState(false);
  const [userVotes, setUserVotes] = useState(() => {
    const n = parseInt(localStorage.getItem(USER_VOTES_STORE), 10);
    return Number.isFinite(n) ? n : 0;
  });
  const [flashAgree, setFlashAgree] = useState(null);
  const [survey, setSurvey] = useState(loadSurvey);
  const [activeQ, setActiveQ] = useState(null);

  const buildingsRef = useRef(buildings);
  buildingsRef.current = buildings;
  const pairRef = useRef(pair);
  pairRef.current = pair;
  const flashRef = useRef(flash);
  flashRef.current = flash;
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const surveyRef = useRef(survey);
  surveyRef.current = survey;
  const activeQRef = useRef(activeQ);
  activeQRef.current = activeQ;
  const lastPairRef = useRef(null);   // the two buildings just voted on

  /**
   * Choose the next survey question. Every second survey is the neighborhood
   * question, so answers stay segmentable by where people live; the rest are
   * drawn from the bank weighted by each question's stated frequency.
   */
  function openSurvey() {
    const s = surveyRef.current;
    const nth = s.asked + 1;
    let q;
    if (nth % 2 === 0) {
      q = NEIGHBORHOOD_QUESTION;
    } else {
      // Don't repeat a question until the bank has been worked through a bit.
      const recent = s.responses.slice(-8).map((r) => r.qid);
      q = pickQuestion(recent);
      if (q.pair) {
        const [a, b] = lastPairRef.current || [];
        if (!a || !b) q = pickQuestion(recent.concat(q.id));
        else q = { ...q, options: [a.address, b.address] };
      }
    }
    const next = { ...s, asked: nth };
    surveyRef.current = next;
    setSurvey(next);
    saveSurvey(next);
    setActiveQ(q);
  }

  function answerSurvey(answer) {
    const q = activeQRef.current;
    if (!q) return;
    const next = recordAnswer(surveyRef.current, q, answer);
    surveyRef.current = next;
    setSurvey(next);
    saveSurvey(next);
    setActiveQ(null);
  }

  function newPair(list) {
    const bs = list || buildingsRef.current;
    if (bs.length < 2) { setPair(null); setFlash(null); return; }
    let i = Math.floor(Math.random() * bs.length), j;
    do { j = Math.floor(Math.random() * bs.length); } while (j === i);
    setPair([bs[i].id, bs[j].id]);
    setFlash(null);
  }

  function vote(idx) {
    const bs = buildingsRef.current;
    const pr = pairRef.current;
    if (!pr || flashRef.current || activeQRef.current) return;
    const winner = bs.find((b) => b.id === pr[idx]);
    const loser = bs.find((b) => b.id === pr[1 - idx]);
    if (!winner || !loser) return;
    const p = expected(winner.rating, loser.rating);
    const delta = Math.max(1, Math.round(K_FACTOR * (1 - p)));
    // Elo's expected score is exactly the share of voters predicted to make the
    // same pick, so it doubles as an "you agreed with X%" readout.
    const agree = Math.min(99, Math.max(1, Math.round(p * 100)));
    lastPairRef.current = [winner, loser];
    const next = bs.map((b) => {
      if (b.id === winner.id) return { ...b, rating: b.rating + delta, wins: b.wins + 1 };
      if (b.id === loser.id) return { ...b, rating: b.rating - delta, losses: b.losses + 1 };
      return b;
    });
    persist(next);
    setBuildings(next);
    setFlash(idx === 0 ? 'left' : 'right');
    setFlashDelta(delta);
    setFlashAgree(agree);
    let cast = 0;
    setUserVotes((n) => {
      cast = n + 1;
      try { localStorage.setItem(USER_VOTES_STORE, String(cast)); } catch (e) {}
      return cast;
    });
    setTimeout(() => {
      newPair(next);
      if (cast > 0 && cast % SURVEY_EVERY === 0) openSurvey();
    }, 1150);
  }

  useEffect(() => {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(STORE)); } catch (e) {}
    if (!Array.isArray(data) || data.length < 2) { data = seed(); persist(data); }
    setBuildings(data);
    buildingsRef.current = data;
    newPair(data);

    const onKey = (e) => {
      if (screenRef.current !== 'vote' || flashRef.current || !pairRef.current || activeQRef.current) return;
      const k = (e.key || '').toLowerCase();
      if (e.key === 'ArrowLeft' || k === 'a') { e.preventDefault(); vote(0); }
      else if (e.key === 'ArrowRight' || k === 'd') { e.preventDefault(); vote(1); }
      else if (k === 's') { e.preventDefault(); newPair(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Keep the URL in step with the hidden admin route.
  useEffect(() => {
    const path = location.pathname.replace(/\/+$/, '');
    if (screen === 'admin' && path !== '/admin') history.replaceState(null, '', '/admin');
    else if (screen !== 'admin' && path === '/admin') history.replaceState(null, '', '/');
  }, [screen]);

  function setFormField(k, v) { setForm((s) => ({ ...s, [k]: v })); }

  function saveBuilding() {
    const f = form;
    if (!f.address.trim()) return;
    let list;
    if (editId) {
      list = buildings.map((b) => b.id === editId
        ? { ...b, address: f.address.trim(), neighborhood: f.neighborhood.trim(), type: f.type.trim() || '—', photo: f.photo.trim() }
        : b);
    } else {
      list = [...buildings, {
        id: 'b_' + Date.now(), address: f.address.trim(), neighborhood: f.neighborhood.trim(),
        type: f.type.trim() || '—', photo: f.photo.trim(), rating: START_RATING, wins: 0, losses: 0,
      }];
    }
    persist(list);
    const hadPair = !!pair;
    setBuildings(list);
    buildingsRef.current = list;
    setForm(emptyForm);
    setEditId(null);
    if (!hadPair) newPair(list);
  }

  function cancelEdit() { setForm(emptyForm); setEditId(null); }

  function editBuilding(b) {
    setEditId(b.id);
    setForm({ address: b.address, neighborhood: b.neighborhood, type: b.type === '—' ? '' : b.type, photo: b.photo || '' });
  }

  function deleteBuilding(id) {
    const list = buildings.filter((b) => b.id !== id);
    persist(list);
    const inPair = pair && pair.indexOf(id) !== -1;
    setBuildings(list);
    buildingsRef.current = list;
    if (inPair) newPair(list);
  }

  function importBulk() {
    const lines = bulk.split('\n').map((l) => l.trim()).filter(Boolean);
    const add = lines.map((l, i) => {
      const p = l.split(/[\t|]/).map((s) => s.trim());
      return { id: 'b_' + Date.now() + '_' + i, address: p[0] || 'UNTITLED', neighborhood: p[1] || '', type: p[2] || '—', photo: p[3] || '', rating: START_RATING, wins: 0, losses: 0 };
    });
    if (!add.length) return;
    const list = [...buildings, ...add];
    persist(list);
    const hadPair = !!pair;
    setBuildings(list);
    buildingsRef.current = list;
    setBulk('');
    if (!hadPair) newPair(list);
  }

  function restoreDefaults() {
    const d = seed();
    persist(d);
    setBuildings(d);
    buildingsRef.current = d;
    newPair(d);
  }

  function resetElo() {
    const list = buildings.map((b) => ({ ...b, rating: START_RATING, wins: 0, losses: 0 }));
    persist(list);
    setBuildings(list);
    buildingsRef.current = list;
  }

  function copyTsv(tsv) {
    try { navigator.clipboard.writeText(tsv); } catch (e) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const byId = (id) => buildings.find((b) => b.id === id);
  const totalVotes = buildings.reduce((a, b) => a + (b.wins || 0), 0);
  const sorted = [...buildings].sort((a, b) => b.rating - a.rating);
  const pairL = pair ? byId(pair[0]) : null;
  const pairR = pair ? byId(pair[1]) : null;
  const detail = detailId ? byId(detailId) : null;
  const games = detail ? (detail.wins || 0) + (detail.losses || 0) : 0;
  const detailView = detail ? {
    address: detail.address, neighborhood: detail.neighborhood, type: detail.type || '—',
    rating: Math.round(detail.rating), rank: sorted.findIndex((b) => b.id === detail.id) + 1,
    wins: detail.wins || 0, losses: detail.losses || 0,
    winPct: games > 0 ? Math.round(100 * (detail.wins || 0) / games) + '%' : '—',
    photo: detail.photo || '',
  } : null;
  const exportTsv = buildings.map((b) => [b.address, b.neighborhood, b.type || '', Math.round(b.rating), b.wins || 0, b.losses || 0].join('\t')).join('\n');

  const left = pairL ? { address: pairL.address, neighborhood: pairL.neighborhood, type: pairL.type || '—', rating: Math.round(pairL.rating), photo: pairL.photo || '' } : null;
  const right = pairR ? { address: pairR.address, neighborhood: pairR.neighborhood, type: pairR.type || '—', rating: Math.round(pairR.rating), photo: pairR.photo || '' } : null;

  const navItem = (active) => ({
    background: 'transparent', color: active ? ink : gray, border: 'none',
    padding: '8px 14px', borderRadius: 4, fontSize: 13, letterSpacing: '0.02em',
    cursor: 'pointer', fontWeight: active ? 700 : 400,
    textDecoration: active ? 'underline' : 'none', textUnderlineOffset: 3,
  });
  const greenBtn = { background: ink, color: '#fff', border: 'none', padding: '11px 22px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600, letterSpacing: '0.02em' };
  const softBtn = { background: '#fff', color: ink, border: `1px solid ${line}`, padding: '11px 22px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 400 };
  const cardBox = { background: '#fff', border: `1px solid ${line}`, borderRadius: 4, overflow: 'hidden' };
  const cardHead = { background: subtle, borderBottom: `1px solid ${line}`, padding: '12px 18px', fontFamily: sans, fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: gray, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' };
  const fieldStyle = { border: `1px solid ${line}`, padding: '10px 12px', fontSize: 13, background: '#fff', width: '100%', borderRadius: 4, color: ink };

  const VoteCard = ({ side, b, badge, onVote, isFlash }) => (
    <div onClick={onVote} className="vote-card" style={{ position: 'relative', width: 'min(38vw,48vh,400px)', cursor: 'pointer', background: '#fff', border: `1px solid ${line}`, borderRadius: 4, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden' }}>
        <Photo photo={b.photo} style={{ position: 'absolute', inset: 0 }} />
        <div style={{ position: 'absolute', left: 10, bottom: 10, background: 'rgba(255,255,255,0.88)', color: ink, padding: '3px 8px', borderRadius: 2, fontSize: 11, fontFamily: sans, fontWeight: 700, letterSpacing: '0.06em', backdropFilter: 'blur(4px)' }}>ELO {b.rating}</div>
        {isFlash && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.18)' }}>
            <div className="pop" style={{ background: '#fff', color: ink, padding: '18px 24px', borderRadius: 4, textAlign: 'center', border: `1px solid ${line}`, maxWidth: '86%' }}>
              <div style={{ fontFamily: serif, fontSize: 32, fontWeight: 700, color: ink }}>+{flashDelta}</div>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: gray, marginTop: 2 }}>ELO</div>
              {flashAgree != null && (
                <div style={{ fontSize: 12, color: gray, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${line}`, lineHeight: 1.4 }}>
                  You agreed with <b style={{ color: ink, fontWeight: 700 }}>{flashAgree}%</b> of voters.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: '12px 16px 16px', borderTop: `1px solid ${line}` }}>
        <div style={{ fontSize: 11, fontFamily: sans, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: gray, marginBottom: 6 }}>{badge}</div>
        <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 400, color: ink, lineHeight: 1.3 }}>{b.address}</div>
        <div style={{ fontSize: 11, color: gray, marginTop: 4, letterSpacing: '0.02em' }}>{typeLine(b.neighborhood, b.type)}</div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: sans, fontVariantNumeric: 'tabular-nums', color: ink, background: '#fff', height: screen === 'vote' ? '100vh' : 'auto', minHeight: '100vh', overflow: screen === 'vote' ? 'hidden' : 'visible', display: 'flex', flexDirection: 'column' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderBottom: `1px solid ${line}`, padding: '12px 22px', flexWrap: 'wrap', gap: 10 }}>
        <button onClick={() => setScreen('vote')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: serif, fontSize: 18, fontWeight: 700, color: ink, letterSpacing: '0em' }}>
          Facade Off
        </button>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button onClick={() => setScreen('vote')} className="nav-link" style={navItem(screen === 'vote')}>Vote</button>
          <button onClick={() => setScreen('rank')} className="nav-link" style={navItem(screen === 'rank' || screen === 'detail')}>Rankings</button>
          <button onClick={() => setScreen('insights')} className="nav-link" style={navItem(screen === 'insights')}>Insights</button>
          <button onClick={() => setScreen('about')} className="nav-link" style={navItem(screen === 'about')}>About</button>
        </div>
      </div>

      {screen === 'vote' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '36px 20px 0', flex: 'none' }}>
            <h1 style={{ fontFamily: serif, fontSize: 'clamp(22px,2.8vw,30px)', fontWeight: 400, color: ink, margin: 0, lineHeight: 1.2, maxWidth: 600, textWrap: 'balance' }}>Which building is better designed?</h1>
            <div style={{ fontSize: 12, fontFamily: sans, color: gray, marginTop: 18, letterSpacing: '0.02em' }}>Click a card, or use <kbd style={{ fontFamily: sans, fontSize: 11, background: '#f4f4f4', border: '1px solid #d8d8d8', borderRadius: 3, padding: '1px 5px' }}>A</kbd> / <kbd style={{ fontFamily: sans, fontSize: 11, background: '#f4f4f4', border: '1px solid #d8d8d8', borderRadius: 3, padding: '1px 5px' }}>D</kbd> or <kbd style={{ fontFamily: sans, fontSize: 11, background: '#f4f4f4', border: '1px solid #d8d8d8', borderRadius: 3, padding: '1px 5px' }}>←</kbd> / <kbd style={{ fontFamily: sans, fontSize: 11, background: '#f4f4f4', border: '1px solid #d8d8d8', borderRadius: 3, padding: '1px 5px' }}>→</kbd> to vote</div>
          </div>

          {left && right ? (
            <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 32px 0', gap: 32 }}>
              <VoteCard side="left" b={left} badge="A" onVote={() => vote(0)} isFlash={flash === 'left'} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, flex: 'none' }}>
                <div style={{ fontFamily: serif, fontSize: 14, fontStyle: 'italic', color: gray }}>or</div>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: gray, fontSize: 11, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 3, background: subtle, border: `1px solid ${line}`, color: ink, fontSize: 11, fontWeight: 700, fontFamily: sans }}>S</span>
                  skip
                </span>
              </div>
              <VoteCard side="right" b={right} badge="D" onVote={() => vote(1)} isFlash={flash === 'right'} />
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, textAlign: 'center', fontSize: 14, color: gray }}>Need at least two buildings — add some in Admin.</div>
          )}
          <div style={{ flex: 'none', padding: '16px 20px 0', textAlign: 'center', fontSize: 11, fontFamily: sans, letterSpacing: '0.04em', color: gray, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>{totalVotes.toLocaleString()} total votes&nbsp;&nbsp;·&nbsp;&nbsp;{userVotes.toLocaleString()} votes you cast</div>
            {userVotes >= PROFILE_AT ? (
              <button onClick={() => setScreen('profile')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: ink, fontSize: 11, fontFamily: sans, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'underline', textUnderlineOffset: 3, padding: 0 }}>
                Design Profile
              </button>
            ) : userVotes >= PROFILE_TEASE_AT ? (
              <div>{PROFILE_AT - userVotes} votes until your design profile is unlocked.</div>
            ) : null}
          </div>
        </div>
      )}

      {screen === 'insights' && (
        <Insights survey={survey} buildings={buildings} totalVotes={totalVotes} />
      )}

      {screen === 'profile' && (
        <Profile survey={survey} userVotes={userVotes} onBack={() => setScreen('vote')} />
      )}

      {screen === 'rank' && (
        <div style={{ flex: 1, padding: '40px 28px', maxWidth: 980, margin: '0 auto', width: '100%' }}>
          <h1 style={{ fontFamily: serif, fontSize: 'clamp(30px,4vw,42px)', fontWeight: 600, letterSpacing: '-0.02em', color: ink, margin: 0 }}>Rankings</h1>
          <div style={{ fontSize: 15, color: gray, marginTop: 8, marginBottom: 26 }}>How the city's buildings stack up, by Elo rating.</div>
          <div style={cardBox}>
            <div style={{ display: 'flex', background: subtle, color: gray, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: `1px solid ${line}` }}>
              <span style={{ width: 52, padding: '14px 16px' }}>#</span>
              <span style={{ flex: 2, padding: '14px 16px' }}>Building</span>
              <span style={{ flex: 1.5, padding: '14px 16px' }}>Neighborhood</span>
              <span style={{ width: 140, padding: '14px 16px' }}>Type</span>
              <span style={{ width: 80, padding: '14px 16px', textAlign: 'center' }}>W–L</span>
              <span style={{ width: 80, padding: '14px 16px', textAlign: 'right' }}>Elo</span>
            </div>
            {sorted.map((b, i) => (
              <div key={b.id} onClick={() => { setDetailId(b.id); setScreen('detail'); }} className="rank-row" style={{ display: 'flex', borderBottom: i === sorted.length - 1 ? 'none' : `1px solid ${line}`, fontSize: 14, cursor: 'pointer', alignItems: 'center' }}>
                <span style={{ width: 52, padding: '15px 16px', fontFamily: serif, fontWeight: 600, fontSize: 16, color: ink }}>{i + 1}</span>
                <span style={{ flex: 2, padding: '15px 16px', fontWeight: 500 }}>{b.address}</span>
                <span style={{ flex: 1.5, padding: '15px 16px', fontSize: 13, color: gray }}>{b.neighborhood}</span>
                <span style={{ width: 140, padding: '15px 16px', fontSize: 12, color: gray }}>{b.type || '—'}</span>
                <span style={{ width: 80, padding: '15px 16px', textAlign: 'center', fontSize: 13, color: gray }}>{(b.wins || 0) + '–' + (b.losses || 0)}</span>
                <span style={{ width: 80, padding: '15px 16px', textAlign: 'right', fontFamily: serif, fontWeight: 600, fontSize: 17 }}>{Math.round(b.rating)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {screen === 'detail' && (
        <div style={{ flex: 1, padding: '40px 28px', maxWidth: 920, margin: '0 auto', width: '100%' }}>
          <button onClick={() => setScreen('rank')} className="btn-soft" style={{ ...softBtn, padding: '9px 18px', fontSize: 13 }}>&larr; Back to rankings</button>
          {detailView && (
            <div style={{ display: 'flex', ...cardBox, marginTop: 20, flexWrap: 'wrap' }}>
              <div style={{ width: '42%', minWidth: 280, position: 'relative', minHeight: 360 }}>
                <Photo photo={detailView.photo} style={{ position: 'absolute', inset: 0 }} />
              </div>
              <div style={{ flex: 1, minWidth: 280, padding: 30 }}>
                <div style={{ fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: ink, fontWeight: 600 }}>Rank #{detailView.rank} of {buildings.length}</div>
                <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 600, margin: '8px 0 6px', lineHeight: 1.18, color: ink }}>{detailView.address}</div>
                <div style={{ fontSize: 14, color: gray }}>{typeLine(detailView.neighborhood, detailView.type)}</div>
                <div style={{ fontFamily: serif, fontSize: 70, fontWeight: 600, margin: '22px 0 0', letterSpacing: '-0.03em', color: green, lineHeight: 1 }}>{detailView.rating}</div>
                <div style={{ fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: gray, marginTop: 6 }}>Current Elo rating</div>
                <div style={{ display: 'flex', marginTop: 26, border: `1px solid ${line}`, borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ flex: 1, padding: 18, textAlign: 'center', borderRight: `1px solid ${line}` }}>
                    <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 600 }}>{detailView.wins}</div>
                    <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: gray, marginTop: 2 }}>Wins</div>
                  </div>
                  <div style={{ flex: 1, padding: 18, textAlign: 'center', borderRight: `1px solid ${line}` }}>
                    <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 600 }}>{detailView.losses}</div>
                    <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: gray, marginTop: 2 }}>Losses</div>
                  </div>
                  <div style={{ flex: 1, padding: 18, textAlign: 'center' }}>
                    <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 600 }}>{detailView.winPct}</div>
                    <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: gray, marginTop: 2 }}>Win rate</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {screen === 'about' && (
        <div style={{ flex: 1, padding: '52px 28px', maxWidth: 720, margin: '0 auto', width: '100%', fontSize: 16, lineHeight: 1.75, color: '#3a3a3a' }}>
          <h1 style={{ fontFamily: serif, fontSize: 'clamp(32px,4.4vw,44px)', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 28px', lineHeight: 1.12, color: ink }}>About</h1>

          <h2 style={aboutH2}>What is this tool?</h2>
          <p style={aboutP}>Affordable housing discussions usually focus on how much housing we build. And while in NYC, we need to be building a lot more housing, there&rsquo;s much less attention paid to what quality housing design.</p>
          <p style={aboutP}>Residents consistently describe new affordable housing as blocky and cheap, and yet they are rarely given the chance to weigh in before a design is already locked in.</p>
          <p style={aboutP}>This project is an experiment in understanding public preferences for residential architecture, as it reflects both how its perceived in a neighborhood and a function of how long it may last. By comparing two buildings at a time, visitors help create a ranking of designs that people find attractive, contextual, and welcoming.</p>
          <p style={aboutP}>Rather than asking broad questions like &ldquo;Do you like affordable housing?&rdquo;, we&rsquo;re asking a simpler one: Which building would you rather see in your neighborhood?</p>

          <h2 style={aboutH2}>Why does this matter?</h2>
          <p style={aboutP}>Most community engagement happens after major design decisions have already been made. At that point, conversations often become polarized because people struggle to explain why they dislike a proposal.</p>
          <p style={aboutP}>This project explores whether a lightweight, visual interface can help surface design preferences before those conversations happen.</p>
          <p style={aboutP}>The goal isn&rsquo;t to determine what &ldquo;good architecture&rdquo; is. It&rsquo;s to understand patterns in what communities value.</p>

          <h2 style={aboutH2}>How does it work?</h2>
          <ul style={aboutUl}>
            <li>Every round presents two buildings.</li>
            <li>Pick the one you prefer.</li>
            <li>Rankings are calculated using an Elo rating system (similar to chess ratings).</li>
            <li>Over thousands of comparisons, a community-generated ranking begins to emerge.</li>
          </ul>
          <p style={aboutP}>The more people participate, the more reliable the rankings become.</p>

          <h2 style={aboutH2}>What happens with the data?</h2>
          <p style={aboutP}>The results will help researchers, architects, planners, and developers better understand:</p>
          <ul style={aboutUl}>
            <li>preferred building materials</li>
            <li>preferred building massing</li>
            <li>neighborhood context</li>
            <li>facade articulation</li>
            <li>height preferences</li>
            <li>recurring design patterns</li>
          </ul>
          <p style={{ ...aboutP, marginBottom: 32 }}>Ultimately, the goal is to build better conversations around quality housing design, as we should strive to build buildings that will last and be beautiful for at least the next 100 years.</p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setScreen('vote')} className="btn-green" style={greenBtn}>Start voting →</button>
            <button onClick={() => setScreen('insights')} className="btn-soft" style={softBtn}>See the insights</button>
          </div>
        </div>
      )}

      {screen === 'admin' && !adminOk && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 28px' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (adminPw === ADMIN_PASSWORD) {
                setAdminOk(true);
                setAdminErr(false);
                try { sessionStorage.setItem(ADMIN_UNLOCK, '1'); } catch (err) {}
              } else {
                setAdminErr(true);
              }
              setAdminPw('');
            }}
            style={{ ...cardBox, width: 'min(380px,100%)', padding: 28 }}
          >
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: gray }}>Restricted</div>
            <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 600, color: ink, margin: '8px 0 18px' }}>Admin</div>
            <input
              className="field" type="password" autoFocus value={adminPw}
              onChange={(e) => { setAdminPw(e.target.value); setAdminErr(false); }}
              placeholder="Password" style={fieldStyle}
            />
            {adminErr && <div style={{ fontSize: 12.5, color: '#b04a3a', marginTop: 10 }}>Wrong password.</div>}
            <button type="submit" className="btn-green" style={{ ...greenBtn, width: '100%', marginTop: 16 }}>Unlock</button>
            <button type="button" onClick={() => setScreen('vote')} className="nav-link" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: gray, fontSize: 12.5, marginTop: 14, padding: 0 }}>&larr; Back to voting</button>
          </form>
        </div>
      )}

      {screen === 'admin' && adminOk && (
        <div style={{ flex: 1, padding: '40px 28px', maxWidth: 1000, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <h1 style={{ fontFamily: serif, fontSize: 'clamp(30px,4vw,42px)', fontWeight: 600, letterSpacing: '-0.02em', color: ink, margin: '0 0 4px' }}>Admin</h1>

          <div style={cardBox}>
            <div style={cardHead}>{editId ? 'Edit building' : 'Add building'}</div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 7, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: gray }}>Address
                <input className="field" value={form.address} onChange={(e) => setFormField('address', e.target.value)} placeholder="120 Ocean Pkwy" style={fieldStyle} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: gray }}>Neighborhood
                <input className="field" value={form.neighborhood} onChange={(e) => setFormField('neighborhood', e.target.value)} placeholder="Kensington · Brooklyn" style={fieldStyle} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: gray }}>Building type
                <input className="field" value={form.type} onChange={(e) => setFormField('type', e.target.value)} placeholder="Walk-Up" style={fieldStyle} />
              </label>
              <label style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 7, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: gray }}>Photo URL (optional)
                <input className="field" value={form.photo} onChange={(e) => setFormField('photo', e.target.value)} placeholder="https://..." style={fieldStyle} />
              </label>
            </div>
            <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={saveBuilding} className="btn-green" style={{ ...greenBtn, padding: '11px 22px', fontSize: 13 }}>{editId ? 'Save changes' : 'Add building'}</button>
              {editId && (
                <button onClick={cancelEdit} className="btn-soft" style={{ ...softBtn, padding: '11px 22px', fontSize: 13 }}>Cancel</button>
              )}
            </div>
          </div>

          <div style={cardBox}>
            <div style={cardHead}>Bulk add — paste from a spreadsheet</div>
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 12.5, color: gray, marginBottom: 12 }}>One building per line. Columns separated by tab or | :&nbsp;&nbsp;address | neighborhood | type | photo-url</div>
              <textarea className="field" value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'455 FDR Dr | Lower East Side · Manhattan | Tower | \n90 Sands St | DUMBO · Brooklyn | Mid-Rise |'} style={{ ...fieldStyle, height: 120, resize: 'vertical' }}></textarea>
              <div style={{ marginTop: 14 }}>
                <button onClick={importBulk} className="btn-green" style={{ ...greenBtn, padding: '11px 22px', fontSize: 13 }}>Import rows</button>
              </div>
            </div>
          </div>

          <div style={cardBox}>
            <div style={cardHead}>
              <span>Buildings ({buildings.length})</span>
              <span style={{ display: 'flex', gap: 8 }}>
                <button onClick={resetElo} className="btn-soft" style={{ background: '#fff', color: ink, border: `1.5px solid ${line}`, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, borderRadius: 999 }}>Reset Elo</button>
                <button onClick={restoreDefaults} className="btn-soft" style={{ background: '#fff', color: ink, border: `1.5px solid ${line}`, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, borderRadius: 999 }}>Restore defaults</button>
              </span>
            </div>
            {buildings.map((b, i) => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', borderBottom: i === buildings.length - 1 ? 'none' : `1px solid ${line}`, fontSize: 14, gap: 6 }}>
                <span style={{ flex: 2, padding: '13px 16px', fontWeight: 500 }}>{b.address}</span>
                <span style={{ flex: 1.4, padding: '13px 16px', fontSize: 12.5, color: gray }}>{b.neighborhood}</span>
                <span style={{ width: 130, padding: '13px 16px', fontSize: 12, color: gray }}>{b.type || '—'}</span>
                <span style={{ width: 60, padding: '13px 16px', textAlign: 'right', fontFamily: serif, fontWeight: 600 }}>{Math.round(b.rating)}</span>
                <button onClick={() => editBuilding(b)} className="nav-link" style={{ background: 'transparent', color: ink, border: 'none', padding: '13px 12px', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, borderRadius: 8 }}>Edit</button>
                <button onClick={() => deleteBuilding(b.id)} className="nav-link" style={{ background: 'transparent', color: '#b04a3a', border: 'none', padding: '13px 14px', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, borderRadius: 8 }}>Delete</button>
              </div>
            ))}
          </div>

          <div style={cardBox}>
            <div style={cardHead}>
              <span>Export — TSV (paste into a sheet)</span>
              <button onClick={() => copyTsv(exportTsv)} className="btn-soft" style={{ background: '#fff', color: ink, border: `1.5px solid ${line}`, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, borderRadius: 999 }}>{copied ? 'Copied' : 'Copy'}</button>
            </div>
            <div style={{ padding: 20 }}>
              <textarea readOnly value={exportTsv} style={{ ...fieldStyle, height: 120, resize: 'vertical', background: '#f7faf8', color: '#384740', fontSize: 12.5 }}></textarea>
            </div>
          </div>

        </div>
      )}

      {activeQ && (
        <SurveyModal
          question={activeQ}
          initialValue={activeQ.type === 'Neighborhood' ? survey.neighborhood : ''}
          onAnswer={answerSurvey}
          onClose={() => setActiveQ(null)}
        />
      )}

    </div>
  );
}
