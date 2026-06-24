import { useEffect, useRef, useState } from 'react';
import Photo from './Photo';
import './App.css';

const STORE = 'hhon_nyc_v2';
const USER_VOTES_STORE = 'hhon_user_votes_v1';
const K_FACTOR = 32;
const START_RATING = 1400;

// HPD (nyc.gov/hpd) design system: black text, white background, teal accent.
const brand = '#1c7a8c';
const highlight = '#1c7a8c';
const ink = '#111111';        // black as primary UI/heading color
const green = '#1c7a8c';      // (alias) primary accent/buttons → teal
const greenDeep = '#1c7a8c';  // (alias) accent text → teal
const greenBright = '#1c7a8c';
const line = '#e5e7eb';
const gray = '#5b6470';
const mint = 'linear-gradient(180deg,#f2f8f9 0%,#e4eff1 100%)';
const serif = "'Barlow Semi Condensed','Arial Narrow',sans-serif";
const sans = "'Barlow','Helvetica Neue',Helvetica,Arial,sans-serif";
const cardShadow = '0 18px 44px -18px rgba(28,122,140,0.28)';
const typeLine = (n, t) => (t && t !== '—' ? n + '  ·  ' + t : n);

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

export default function App() {
  const [screen, setScreen] = useState('vote');
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

  const buildingsRef = useRef(buildings);
  buildingsRef.current = buildings;
  const pairRef = useRef(pair);
  pairRef.current = pair;
  const flashRef = useRef(flash);
  flashRef.current = flash;
  const screenRef = useRef(screen);
  screenRef.current = screen;

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
    if (!pr || flashRef.current) return;
    const winner = bs.find((b) => b.id === pr[idx]);
    const loser = bs.find((b) => b.id === pr[1 - idx]);
    if (!winner || !loser) return;
    const delta = Math.max(1, Math.round(K_FACTOR * (1 - expected(winner.rating, loser.rating))));
    const next = bs.map((b) => {
      if (b.id === winner.id) return { ...b, rating: b.rating + delta, wins: b.wins + 1 };
      if (b.id === loser.id) return { ...b, rating: b.rating - delta, losses: b.losses + 1 };
      return b;
    });
    persist(next);
    setBuildings(next);
    setFlash(idx === 0 ? 'left' : 'right');
    setFlashDelta(delta);
    setUserVotes((n) => {
      const nv = n + 1;
      try { localStorage.setItem(USER_VOTES_STORE, String(nv)); } catch (e) {}
      return nv;
    });
    setTimeout(() => newPair(next), 950);
  }

  useEffect(() => {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(STORE)); } catch (e) {}
    if (!Array.isArray(data) || data.length < 2) { data = seed(); persist(data); }
    setBuildings(data);
    buildingsRef.current = data;
    newPair(data);

    const onKey = (e) => {
      if (screenRef.current !== 'vote' || flashRef.current || !pairRef.current) return;
      const k = (e.key || '').toLowerCase();
      if (e.key === 'ArrowLeft' || k === 'a') { e.preventDefault(); vote(0); }
      else if (e.key === 'ArrowRight' || k === 'd') { e.preventDefault(); vote(1); }
      else if (k === 's') { e.preventDefault(); newPair(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    background: active ? '#eaf6ee' : 'transparent', color: active ? ink : gray, border: 'none',
    padding: '9px 16px', borderRadius: 999, fontSize: 13.5, letterSpacing: '0.01em',
    cursor: 'pointer', fontWeight: active ? 600 : 500,
  });
  const greenBtn = { background: green, color: '#fff', border: 'none', padding: '13px 24px', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: 600, letterSpacing: '0.01em' };
  const softBtn = { background: '#fff', color: ink, border: `1.5px solid ${line}`, padding: '13px 24px', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: 600, letterSpacing: '0.01em' };
  const cardBox = { background: '#fff', border: `1px solid ${line}`, borderRadius: 20, boxShadow: '0 12px 30px -20px rgba(28,122,140,0.25)', overflow: 'hidden' };
  const cardHead = { background: '#eaf4f5', borderBottom: `1px solid ${line}`, padding: '13px 18px', fontFamily: serif, fontSize: 16, fontWeight: 600, color: ink, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' };
  const fieldStyle = { border: `1.5px solid ${line}`, padding: '11px 13px', fontSize: 14, background: '#fff', width: '100%', borderRadius: 12, color: ink };

  const VoteCard = ({ side, b, badge, onVote, isFlash }) => (
    <div onClick={onVote} className="vote-card" style={{ position: 'relative', width: 'min(42vw,440px)', height: '100%', maxHeight: 420, cursor: 'pointer', background: mint, borderRadius: 26, boxShadow: cardShadow, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', flex: 1, minHeight: 140, margin: '14px 16px 0', borderRadius: 18, overflow: 'hidden' }}>
        <Photo photo={b.photo} style={{ position: 'absolute', inset: 0 }} />
        <div style={{ position: 'absolute', left: 12, bottom: 12, background: 'rgba(255,255,255,0.92)', color: greenDeep, padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', backdropFilter: 'blur(4px)' }}>ELO {b.rating}</div>
        {isFlash && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(28,122,140,0.28)' }}>
            <div className="pop" style={{ background: '#fff', color: ink, padding: '18px 28px', borderRadius: 20, textAlign: 'center', boxShadow: '0 16px 40px -10px rgba(28,122,140,0.4)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 999, background: green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 8px' }}>✓</div>
              <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 600, color: greenDeep }}>+{flashDelta}</div>
              <div style={{ fontSize: 10, letterSpacing: '0.28em', color: gray, marginTop: 2 }}>ELO</div>
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: '18px 26px 26px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 26, height: 26, padding: '0 9px', borderRadius: 999, background: '#fff', color: greenDeep, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 14, boxShadow: '0 2px 8px -2px rgba(28,122,140,0.25)' }}>{badge}</div>
        <div style={{ fontFamily: serif, fontSize: 25, fontWeight: 600, color: ink, lineHeight: 1.18 }}>{b.address}</div>
        <div style={{ fontSize: 13, color: gray, marginTop: 9, letterSpacing: '0.01em' }}>{typeLine(b.neighborhood, b.type)}</div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: sans, fontVariantNumeric: 'tabular-nums', color: ink, background: '#fff', height: screen === 'vote' ? '100vh' : 'auto', minHeight: '100vh', overflow: screen === 'vote' ? 'hidden' : 'visible', display: 'flex', flexDirection: 'column' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderBottom: `1px solid ${line}`, padding: '14px 22px', flexWrap: 'wrap', gap: 10 }}>
        <button onClick={() => setScreen('vote')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: serif, fontSize: 21, fontWeight: 600, color: ink, letterSpacing: '-0.01em' }}>
          Facade <span style={{ background: highlight, color: ink, padding: '0 6px', borderRadius: 6 }}>Off</span>
        </button>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button onClick={() => setScreen('vote')} className="nav-link" style={navItem(screen === 'vote')}>Vote</button>
          <button onClick={() => setScreen('rank')} className="nav-link" style={navItem(screen === 'rank' || screen === 'detail')}>Rankings</button>
          <button onClick={() => setScreen('about')} className="nav-link" style={navItem(screen === 'about')}>About</button>
          <button onClick={() => setScreen('admin')} className="nav-link" style={navItem(screen === 'admin')}>Admin</button>
        </div>
      </div>

      {screen === 'vote' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px 20px 0', flex: 'none' }}>
            <h1 style={{ fontFamily: serif, fontSize: 'clamp(24px,3.4vw,34px)', fontWeight: 600, letterSpacing: '-0.02em', color: ink, margin: 0, lineHeight: 1.12, maxWidth: 680 }}>What does quality housing design look like?</h1>
            <div style={{ fontSize: 14, color: gray, marginTop: 10, lineHeight: 1.55, maxWidth: 580 }}>Compare two real affordable housing developments and choose the one you think is better designed.</div>
            <span style={{ background: '#eaf4f5', color: greenDeep, padding: '5px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, letterSpacing: '0.02em', marginTop: 12 }}>{userVotes.toLocaleString()} votes cast</span>
          </div>

          {left && right ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 0, padding: '14px 32px 0', gap: 6 }}>
              <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'wrap', width: '100%' }}>
                <VoteCard side="left" b={left} badge="A" onVote={() => vote(0)} isFlash={flash === 'left'} />
                <div style={{ width: 54, height: 54, flex: 'none', background: '#fff', color: greenDeep, borderRadius: 999, boxShadow: '0 10px 24px -8px rgba(28,122,140,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: serif, fontSize: 17, fontWeight: 600, zIndex: 3, margin: '0 -16px' }}>or</div>
                <VoteCard side="right" b={right} badge="D" onVote={() => vote(1)} isFlash={flash === 'right'} />
              </div>
              <span style={{ background: '#eaf4f5', color: gray, padding: '5px 13px', borderRadius: 999, fontSize: 12, fontWeight: 500, letterSpacing: '0.02em', flex: 'none' }}>← / → or click · S to skip</span>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, textAlign: 'center', fontSize: 15, color: gray }}>Need at least two buildings — add some in Admin.</div>
          )}
          <div style={{ flex: 'none', padding: '10px 20px', textAlign: 'center', fontSize: 13, color: gray, borderTop: `1px solid ${line}` }}>{totalVotes.toLocaleString()} votes&nbsp;&nbsp;·&nbsp;&nbsp;{buildings.length} buildings</div>
        </div>
      )}

      {screen === 'rank' && (
        <div style={{ flex: 1, padding: '40px 28px', maxWidth: 980, margin: '0 auto', width: '100%' }}>
          <h1 style={{ fontFamily: serif, fontSize: 'clamp(30px,4vw,42px)', fontWeight: 600, letterSpacing: '-0.02em', color: ink, margin: 0 }}>Rankings</h1>
          <div style={{ fontSize: 15, color: gray, marginTop: 8, marginBottom: 26 }}>How the city's buildings stack up, by Elo rating.</div>
          <div style={cardBox}>
            <div style={{ display: 'flex', background: '#eaf4f5', color: gray, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: `1px solid ${line}` }}>
              <span style={{ width: 52, padding: '14px 16px' }}>#</span>
              <span style={{ flex: 2, padding: '14px 16px' }}>Building</span>
              <span style={{ flex: 1.5, padding: '14px 16px' }}>Neighborhood</span>
              <span style={{ width: 140, padding: '14px 16px' }}>Type</span>
              <span style={{ width: 80, padding: '14px 16px', textAlign: 'center' }}>W–L</span>
              <span style={{ width: 80, padding: '14px 16px', textAlign: 'right' }}>Elo</span>
            </div>
            {sorted.map((b, i) => (
              <div key={b.id} onClick={() => { setDetailId(b.id); setScreen('detail'); }} className="rank-row" style={{ display: 'flex', borderBottom: i === sorted.length - 1 ? 'none' : `1px solid ${line}`, fontSize: 14, cursor: 'pointer', alignItems: 'center' }}>
                <span style={{ width: 52, padding: '15px 16px', fontFamily: serif, fontWeight: 600, fontSize: 16, color: i < 3 ? greenDeep : ink }}>{i + 1}</span>
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
                <div style={{ fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: greenDeep, fontWeight: 600 }}>Rank #{detailView.rank} of {buildings.length}</div>
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
        <div style={{ flex: 1, padding: '52px 28px', maxWidth: 720, margin: '0 auto', width: '100%', fontSize: 16, lineHeight: 1.75, color: '#384740' }}>
          <h1 style={{ fontFamily: serif, fontSize: 'clamp(32px,4.4vw,44px)', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 6px', lineHeight: 1.12, color: ink }}>What will all this housing actually look like?</h1>
          <div style={{ fontFamily: serif, fontSize: 18, color: green, fontWeight: 500, marginBottom: 30 }}>A design-literacy tool, not a popularity contest.</div>
          <p style={{ margin: '0 0 20px' }}>New York City is in the middle of its most ambitious housing push in a generation — but the conversation about <b style={{ color: ink }}>how many</b> units to build has crowded out the question of what those units will actually look like. Residents consistently describe new affordable housing as <b style={{ color: ink }}>blocky and cheap</b>, and yet they are rarely given the chance to weigh in before a design is already locked in.</p>
          <p style={{ margin: '0 0 20px' }}>This site is a companion to an NYU Wagner capstone study on design quality in affordable housing. Two real, recently built NYC buildings show up side by side. One blunt question: <b style={{ color: ink }}>which one is the better-designed building?</b> Every vote is a small act of practicing design literacy — the same vocabulary the report argues communities need but are rarely given.</p>
          <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, margin: '36px 0 10px', color: ink }}>Why this matters</h2>
          <p style={{ margin: '0 0 20px' }}>Our research found that design decisions are typically finalized long before communities get a formal say, that good design is shaped by neighborhood context, that design quality is mostly a matter of professional culture rather than cost, and that 98% of residents surveyed want to participate in design — but lack the language to do it. A Common Design Vocabulary is one of our core recommendations. This game is a small, public version of that idea: practice naming what works and what doesn't.</p>
          <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, margin: '36px 0 10px', color: ink }}>The math</h2>
          <p style={{ margin: '0 0 20px' }}>Every building carries an <b style={{ color: ink }}>Elo rating</b>, the same system used to rank chess players. Beat a higher-rated building and you gain a lot; beat a weaker one and you gain a little. The swing is set by a K-factor (default 32, tweakable). Ratings are zero-sum: the winner takes exactly what the loser gives up.</p>
          <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, margin: '36px 0 10px', color: ink }}>The rules</h2>
          <p style={{ margin: '0 0 20px' }}>Click a building, or use the <b style={{ color: ink }}>← / →</b> arrow keys, to cast your vote. Check the rankings to see how the city's buildings stack up.</p>
          <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, margin: '36px 0 10px', color: ink }}>The data</h2>
          <p style={{ margin: '0 0 28px' }}>Seeded with real, recently completed affordable housing buildings from NYC's open <b style={{ color: ink }}>Affordable Housing Production by Building</b> dataset, spanning all five boroughs. Everything lives in your browser. Add buildings, paste a whole spreadsheet, or export the current set as TSV from the <b style={{ color: ink }}>Admin</b> panel — ready for the day real building photos drop in.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setScreen('vote')} className="btn-green" style={greenBtn}>Start voting →</button>
            <button onClick={() => setScreen('admin')} className="btn-soft" style={softBtn}>Open Admin</button>
          </div>
        </div>
      )}

      {screen === 'admin' && (
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
                <button onClick={() => editBuilding(b)} className="nav-link" style={{ background: 'transparent', color: greenDeep, border: 'none', padding: '13px 12px', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, borderRadius: 8 }}>Edit</button>
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

    </div>
  );
}
