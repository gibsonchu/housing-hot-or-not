import { useEffect, useRef, useState } from 'react';
import Photo from './Photo';
import './App.css';

const STORE = 'hhon_nyc_v2';
const K_FACTOR = 32;
const START_RATING = 1400;

const navy = '#14315c';
const amber = '#f4a51c';

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

  const left = pairL ? { address: pairL.address, neighborhood: pairL.neighborhood, rating: Math.round(pairL.rating), photo: pairL.photo || '' } : null;
  const right = pairR ? { address: pairR.address, neighborhood: pairR.neighborhood, rating: Math.round(pairR.rating), photo: pairR.photo || '' } : null;

  const navBtnStyle = {
    background: 'transparent', border: 'none', borderLeft: '2px solid #2c4a76', color: '#fff',
    padding: '14px 18px', fontSize: 12, letterSpacing: '0.12em', cursor: 'pointer',
  };
  const lbl = (c, t) => (c ? '[ ' + t + ' ]' : t);

  return (
    <div style={{ fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif", fontVariantNumeric: 'tabular-nums', color: navy, background: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', background: navy, color: '#fff', borderBottom: `3px solid ${amber}`, flexWrap: 'wrap' }}>
        <button onClick={() => setScreen('vote')} className="nav-btn" style={{ background: 'transparent', border: 'none', color: '#fff', padding: '14px 18px', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer', textAlign: 'left' }}>
          HOUSING : HOT OR NOT <span style={{ color: '#8ea7c8' }}>/ NYC</span>
        </button>
        <div style={{ display: 'flex' }}>
          <button onClick={() => setScreen('vote')} className="nav-btn" style={navBtnStyle}>{lbl(screen === 'vote', 'VOTE')}</button>
          <button onClick={() => setScreen('rank')} className="nav-btn" style={navBtnStyle}>{lbl(screen === 'rank' || screen === 'detail', 'RANKINGS')}</button>
          <button onClick={() => setScreen('about')} className="nav-btn" style={navBtnStyle}>{lbl(screen === 'about', 'ABOUT')}</button>
          <button onClick={() => setScreen('admin')} className="nav-btn" style={navBtnStyle}>{lbl(screen === 'admin', 'ADMIN')}</button>
        </div>
      </div>

      {screen === 'vote' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: `2px solid ${navy}`, fontSize: 11, background: '#fff', flexWrap: 'wrap' }}>
            <span style={{ marginLeft: 'auto', padding: '9px 14px', letterSpacing: '0.1em', display: 'flex', alignItems: 'center' }}>VOTES CAST : {totalVotes}</span>
            <span style={{ padding: '9px 14px', borderLeft: `2px solid ${navy}`, letterSpacing: '0.1em', display: 'flex', alignItems: 'center', background: '#e7edf5' }}>← / → OR CLICK</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '22px 16px 12px' }}>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', maxWidth: 640 }}>WHICH IS THE BETTER-DESIGNED BUILDING?</div>
            <div style={{ fontSize: 12, letterSpacing: '0.06em', color: '#6b7f9e', marginTop: 7, lineHeight: 1.6, maxWidth: 560 }}>Real NYC affordable housing. Judge on design quality — proportion, materials, how it meets the street.</div>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', color: '#9fb0c8', marginTop: 5 }}>A / D OR CLICK TO VOTE · S TO SKIP</div>
          </div>

          {left && right ? (
            <>
                <div style={{ flex: 1, background: '#e7edf5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, minHeight: '62vh', flexWrap: 'wrap' }}>
                  <div onClick={() => vote(0)} style={{ position: 'relative', width: 'min(40vw,420px)', cursor: 'pointer', background: '#fff', border: `3px solid ${navy}`, boxShadow: `9px 9px 0 ${navy}` }}>
                    <div style={{ position: 'relative', height: 300, borderBottom: `3px solid ${navy}`, overflow: 'hidden' }}>
                      <Photo photo={left.photo} style={{ position: 'absolute', inset: 0 }} />
                      {flash === 'left' && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.12)' }}>
                          <div className="stamp" style={{ background: amber, color: navy, padding: '14px 22px', transform: 'rotate(-7deg)', border: `3px solid ${navy}`, textAlign: 'center' }}>
                            <div style={{ fontSize: 11, letterSpacing: '0.3em' }}>WINNER</div>
                            <div style={{ fontSize: 32, fontWeight: 700 }}>+{flashDelta}</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                        <span style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 27, height: 27, border: `2px solid ${navy}`, fontSize: 13, fontWeight: 700 }}>A</span>
                        <span style={{ fontSize: 13, lineHeight: 1.4 }}>{left.address}<br /><span style={{ color: '#7a8aa3', fontSize: 11 }}>{left.neighborhood}</span></span>
                      </span>
                      <span style={{ fontSize: 24, fontWeight: 700, whiteSpace: 'nowrap' }}>{left.rating}</span>
                    </div>
                  </div>
                  <div style={{ width: 60, height: 60, background: amber, color: navy, border: `3px solid ${navy}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, zIndex: 2, margin: '0 -8px' }}>OR</div>
                  <div onClick={() => vote(1)} style={{ position: 'relative', width: 'min(40vw,420px)', cursor: 'pointer', background: '#fff', border: `3px solid ${navy}`, boxShadow: `9px 9px 0 ${navy}` }}>
                    <div style={{ position: 'relative', height: 300, borderBottom: `3px solid ${navy}`, overflow: 'hidden' }}>
                      <Photo photo={right.photo} style={{ position: 'absolute', inset: 0 }} />
                      {flash === 'right' && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.12)' }}>
                          <div className="stamp" style={{ background: amber, color: navy, padding: '14px 22px', transform: 'rotate(-7deg)', border: `3px solid ${navy}`, textAlign: 'center' }}>
                            <div style={{ fontSize: 11, letterSpacing: '0.3em' }}>WINNER</div>
                            <div style={{ fontSize: 32, fontWeight: 700 }}>+{flashDelta}</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24, fontWeight: 700, whiteSpace: 'nowrap' }}>{right.rating}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0, justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 13, lineHeight: 1.4, textAlign: 'right' }}>{right.address}<br /><span style={{ color: '#7a8aa3', fontSize: 11 }}>{right.neighborhood}</span></span>
                        <span style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 27, height: 27, border: `2px solid ${navy}`, fontSize: 13, fontWeight: 700 }}>D</span>
                      </span>
                    </div>
                  </div>
                </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, textAlign: 'center', fontSize: 14, letterSpacing: '0.1em', color: '#555' }}>NEED AT LEAST TWO BUILDINGS — ADD SOME IN ADMIN.</div>
          )}
          <div style={{ marginTop: 'auto', padding: 16, textAlign: 'center', fontSize: 12, letterSpacing: '0.08em', color: '#6b7f9e', borderTop: '1px solid #d6deea' }}>{totalVotes} VOTES &nbsp;&middot;&nbsp; {buildings.length} BUILDINGS</div>
        </div>
      )}

      {screen === 'rank' && (
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', background: navy, color: '#fff', fontSize: 11, letterSpacing: '0.12em' }}>
            <span style={{ width: 56, padding: '13px 14px' }}>#</span>
            <span style={{ flex: 2, padding: '13px 14px' }}>BUILDING</span>
            <span style={{ flex: 1.5, padding: '13px 14px' }}>NEIGHBORHOOD</span>
            <span style={{ width: 150, padding: '13px 14px' }}>TYPE</span>
            <span style={{ width: 84, padding: '13px 14px', textAlign: 'center' }}>W–L</span>
            <span style={{ width: 84, padding: '13px 14px', textAlign: 'right' }}>ELO</span>
          </div>
          {sorted.map((b, i) => (
            <div key={b.id} onClick={() => { setDetailId(b.id); setScreen('detail'); }} className="rank-row" style={{ display: 'flex', borderBottom: `1px solid ${navy}`, fontSize: 13, cursor: 'pointer', alignItems: 'center' }}>
              <span style={{ width: 56, padding: '13px 14px', fontWeight: 700 }}>{i + 1}</span>
              <span style={{ flex: 2, padding: '13px 14px' }}>{b.address}</span>
              <span style={{ flex: 1.5, padding: '13px 14px', fontSize: 12 }}>{b.neighborhood}</span>
              <span style={{ width: 150, padding: '13px 14px', fontSize: 11, letterSpacing: '0.06em' }}>{b.type || '—'}</span>
              <span style={{ width: 84, padding: '13px 14px', textAlign: 'center' }}>{(b.wins || 0) + '–' + (b.losses || 0)}</span>
              <span style={{ width: 84, padding: '13px 14px', textAlign: 'right', fontWeight: 700, fontSize: 15 }}>{Math.round(b.rating)}</span>
            </div>
          ))}
        </div>
      )}

      {screen === 'detail' && (
        <div style={{ flex: 1, padding: 28, maxWidth: 920, margin: '0 auto', width: '100%' }}>
          <button onClick={() => setScreen('rank')} className="btn-outline" style={{ background: '#fff', color: navy, border: `2px solid ${navy}`, padding: '9px 16px', cursor: 'pointer', fontSize: 11, letterSpacing: '0.12em' }}>&larr; BACK TO RANKINGS</button>
          {detailView && (
            <div style={{ display: 'flex', border: `3px solid ${navy}`, marginTop: 18, flexWrap: 'wrap' }}>
              <div style={{ width: '42%', minWidth: 280, position: 'relative', minHeight: 340, borderRight: `3px solid ${navy}` }}>
                <Photo photo={detailView.photo} style={{ position: 'absolute', inset: 0 }} />
              </div>
              <div style={{ flex: 1, minWidth: 280, padding: 26 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.2em', color: '#888' }}>RANK #{detailView.rank} OF {buildings.length}</div>
                <div style={{ fontSize: 27, fontWeight: 700, margin: '6px 0', lineHeight: 1.2 }}>{detailView.address}</div>
                <div style={{ fontSize: 13, color: '#555', letterSpacing: '0.04em' }}>{detailView.neighborhood} &middot; {detailView.type}</div>
                <div style={{ fontSize: 66, fontWeight: 700, margin: '20px 0 2px', letterSpacing: '-0.03em', color: amber }}>{detailView.rating}</div>
                <div style={{ fontSize: 11, letterSpacing: '0.2em', color: '#888' }}>CURRENT ELO RATING</div>
                <div style={{ display: 'flex', marginTop: 24, border: `2px solid ${navy}` }}>
                  <div style={{ flex: 1, padding: 16, textAlign: 'center', borderRight: `2px solid ${navy}` }}>
                    <div style={{ fontSize: 30, fontWeight: 700 }}>{detailView.wins}</div>
                    <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#888' }}>WINS</div>
                  </div>
                  <div style={{ flex: 1, padding: 16, textAlign: 'center', borderRight: `2px solid ${navy}` }}>
                    <div style={{ fontSize: 30, fontWeight: 700 }}>{detailView.losses}</div>
                    <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#888' }}>LOSSES</div>
                  </div>
                  <div style={{ flex: 1, padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 30, fontWeight: 700 }}>{detailView.winPct}</div>
                    <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#888' }}>WIN RATE</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {screen === 'about' && (
        <div style={{ flex: 1, padding: '40px 28px', maxWidth: 740, margin: '0 auto', width: '100%', fontSize: 15, lineHeight: 1.75 }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.01em', margin: '0 0 4px', lineHeight: 1.15 }}>WHAT WILL ALL THIS HOUSING ACTUALLY LOOK LIKE?</h1>
          <div style={{ fontSize: 12, letterSpacing: '0.2em', color: '#888', marginBottom: 28 }}>A DESIGN-LITERACY TOOL, NOT A POPULARITY CONTEST.</div>
          <p style={{ margin: '0 0 18px' }}>New York City is in the middle of its most ambitious housing push in a generation — but the conversation about <b>how many</b> units to build has crowded out the question of what those units will actually look like. Residents consistently describe new affordable housing as <b>blocky and cheap</b>, and yet they are rarely given the chance to weigh in before a design is already locked in.</p>
          <p style={{ margin: '0 0 18px' }}>This site is a companion to an NYU Wagner capstone study on design quality in affordable housing. Two real, recently built NYC buildings show up side by side. One blunt question: <b>which one is the better-designed building?</b> Every vote is a small act of practicing design literacy — the same vocabulary the report argues communities need but are rarely given.</p>
          <h2 style={{ fontSize: 14, letterSpacing: '0.16em', margin: '30px 0 8px', borderBottom: `2px solid ${navy}`, paddingBottom: 8 }}>WHY THIS MATTERS</h2>
          <p style={{ margin: '0 0 18px' }}>Our research found that design decisions are typically finalized long before communities get a formal say, that good design is shaped by neighborhood context, that design quality is mostly a matter of professional culture rather than cost, and that 98% of residents surveyed want to participate in design — but lack the language to do it. A Common Design Vocabulary is one of our core recommendations. This game is a small, public version of that idea: practice naming what works and what doesn't.</p>
          <h2 style={{ fontSize: 14, letterSpacing: '0.16em', margin: '30px 0 8px', borderBottom: `2px solid ${navy}`, paddingBottom: 8 }}>THE MATH</h2>
          <p style={{ margin: '0 0 18px' }}>Every building carries an <b>Elo rating</b>, the same system used to rank chess players. Beat a higher-rated building and you gain a lot; beat a weaker one and you gain a little. The swing is set by a K-factor (default 32, tweakable). Ratings are zero-sum: the winner takes exactly what the loser gives up.</p>
          <h2 style={{ fontSize: 14, letterSpacing: '0.16em', margin: '30px 0 8px', borderBottom: `2px solid ${navy}`, paddingBottom: 8 }}>THE RULES</h2>
          <p style={{ margin: '0 0 18px' }}>Click a building, or use the <b>&larr; / &rarr;</b> arrow keys, to cast your vote. Check the RANKINGS to see how the city's buildings stack up.</p>
          <h2 style={{ fontSize: 14, letterSpacing: '0.16em', margin: '30px 0 8px', borderBottom: `2px solid ${navy}`, paddingBottom: 8 }}>THE DATA</h2>
          <p style={{ margin: '0 0 22px' }}>Seeded with real, recently completed affordable housing buildings from NYC's open <b>Affordable Housing Production by Building</b> dataset, spanning all five boroughs. Everything lives in your browser. Add buildings, paste a whole spreadsheet, or export the current set as TSV from the <b>ADMIN</b> panel — ready for the day real building photos drop in.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setScreen('vote')} className="btn-filled" style={{ background: navy, color: '#fff', border: `2px solid ${navy}`, padding: '12px 22px', cursor: 'pointer', fontSize: 12, letterSpacing: '0.12em' }}>START VOTING &rarr;</button>
            <button onClick={() => setScreen('admin')} className="btn-outline" style={{ background: '#fff', color: navy, border: `2px solid ${navy}`, padding: '12px 22px', cursor: 'pointer', fontSize: 12, letterSpacing: '0.12em' }}>OPEN ADMIN</button>
          </div>
        </div>
      )}

      {screen === 'admin' && (
        <div style={{ flex: 1, padding: 28, maxWidth: 1000, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>

          <div style={{ border: `3px solid ${navy}` }}>
            <div style={{ background: navy, color: '#fff', padding: '11px 14px', fontSize: 12, letterSpacing: '0.18em' }}>{editId ? 'EDIT BUILDING' : 'ADD BUILDING'}</div>
            <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 10, letterSpacing: '0.18em', color: '#555' }}>ADDRESS
                <input value={form.address} onChange={(e) => setFormField('address', e.target.value)} placeholder="120 OCEAN PKWY" style={{ border: `2px solid ${navy}`, padding: '10px 12px', fontSize: 13, background: '#fff', width: '100%' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 10, letterSpacing: '0.18em', color: '#555' }}>NEIGHBORHOOD
                <input value={form.neighborhood} onChange={(e) => setFormField('neighborhood', e.target.value)} placeholder="KENSINGTON · BROOKLYN" style={{ border: `2px solid ${navy}`, padding: '10px 12px', fontSize: 13, background: '#fff', width: '100%' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 10, letterSpacing: '0.18em', color: '#555' }}>BUILDING TYPE
                <input value={form.type} onChange={(e) => setFormField('type', e.target.value)} placeholder="WALK-UP" style={{ border: `2px solid ${navy}`, padding: '10px 12px', fontSize: 13, background: '#fff', width: '100%' }} />
              </label>
              <label style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 10, letterSpacing: '0.18em', color: '#555' }}>PHOTO URL (OPTIONAL)
                <input value={form.photo} onChange={(e) => setFormField('photo', e.target.value)} placeholder="HTTPS://..." style={{ border: `2px solid ${navy}`, padding: '10px 12px', fontSize: 13, background: '#fff', width: '100%' }} />
              </label>
            </div>
            <div style={{ padding: '0 18px 18px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={saveBuilding} className="btn-filled" style={{ background: navy, color: '#fff', border: `2px solid ${navy}`, padding: '11px 20px', cursor: 'pointer', fontSize: 12, letterSpacing: '0.12em' }}>{editId ? 'SAVE CHANGES' : 'ADD BUILDING'}</button>
              {editId && (
                <button onClick={cancelEdit} className="btn-outline" style={{ background: '#fff', color: navy, border: `2px solid ${navy}`, padding: '11px 20px', cursor: 'pointer', fontSize: 12, letterSpacing: '0.12em' }}>CANCEL</button>
              )}
            </div>
          </div>

          <div style={{ border: `3px solid ${navy}` }}>
            <div style={{ background: navy, color: '#fff', padding: '11px 14px', fontSize: 12, letterSpacing: '0.18em' }}>BULK ADD — PASTE FROM A SPREADSHEET</div>
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 11, color: '#777', letterSpacing: '0.06em', marginBottom: 10 }}>ONE BUILDING PER LINE. COLUMNS SEPARATED BY TAB OR | :&nbsp;&nbsp;ADDRESS | NEIGHBORHOOD | TYPE | PHOTO-URL</div>
              <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'455 FDR Dr | Lower East Side · Manhattan | Tower | \n90 Sands St | DUMBO · Brooklyn | Mid-Rise |'} style={{ width: '100%', height: 120, border: `2px solid ${navy}`, padding: 12, fontSize: 13, background: '#fff', resize: 'vertical' }}></textarea>
              <div style={{ marginTop: 12 }}>
                <button onClick={importBulk} className="btn-filled" style={{ background: navy, color: '#fff', border: `2px solid ${navy}`, padding: '11px 20px', cursor: 'pointer', fontSize: 12, letterSpacing: '0.12em' }}>IMPORT ROWS</button>
              </div>
            </div>
          </div>

          <div style={{ border: `3px solid ${navy}` }}>
            <div style={{ background: navy, color: '#fff', padding: '11px 14px', fontSize: 12, letterSpacing: '0.18em', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span>BUILDINGS ({buildings.length})</span>
              <span style={{ display: 'flex', gap: 8 }}>
                <button onClick={resetElo} className="admin-action" style={{ background: 'transparent', color: '#fff', border: '1px solid #fff', padding: '6px 12px', cursor: 'pointer', fontSize: 10, letterSpacing: '0.1em' }}>RESET ELO</button>
                <button onClick={restoreDefaults} className="admin-action" style={{ background: 'transparent', color: '#fff', border: '1px solid #fff', padding: '6px 12px', cursor: 'pointer', fontSize: 10, letterSpacing: '0.1em' }}>RESTORE DEFAULTS</button>
              </span>
            </div>
            {buildings.map((b) => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${navy}`, fontSize: 13, gap: 10 }}>
                <span style={{ flex: 2, padding: '11px 14px' }}>{b.address}</span>
                <span style={{ flex: 1.4, padding: '11px 14px', fontSize: 11, color: '#666' }}>{b.neighborhood}</span>
                <span style={{ width: 130, padding: '11px 14px', fontSize: 10, letterSpacing: '0.06em' }}>{b.type || '—'}</span>
                <span style={{ width: 64, padding: '11px 14px', textAlign: 'right', fontWeight: 700 }}>{Math.round(b.rating)}</span>
                <button onClick={() => editBuilding(b)} className="admin-action" style={{ background: '#fff', color: navy, border: 'none', borderLeft: `1px solid ${navy}`, padding: '11px 14px', cursor: 'pointer', fontSize: 10, letterSpacing: '0.1em' }}>EDIT</button>
                <button onClick={() => deleteBuilding(b.id)} className="admin-action" style={{ background: '#fff', color: navy, border: 'none', borderLeft: `1px solid ${navy}`, padding: '11px 14px', cursor: 'pointer', fontSize: 10, letterSpacing: '0.1em' }}>DELETE</button>
              </div>
            ))}
          </div>

          <div style={{ border: `3px solid ${navy}` }}>
            <div style={{ background: navy, color: '#fff', padding: '11px 14px', fontSize: 12, letterSpacing: '0.18em', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span>EXPORT — TSV (PASTE INTO A SHEET)</span>
              <button onClick={() => copyTsv(exportTsv)} className="export-copy" style={{ background: 'transparent', color: '#fff', border: '1px solid #fff', padding: '6px 12px', cursor: 'pointer', fontSize: 10, letterSpacing: '0.1em' }}>{copied ? 'COPIED' : 'COPY'}</button>
            </div>
            <div style={{ padding: 18 }}>
              <textarea readOnly value={exportTsv} style={{ width: '100%', height: 120, border: `2px solid ${navy}`, padding: 12, fontSize: 12, background: '#fafafa', resize: 'vertical', color: '#333' }}></textarea>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
