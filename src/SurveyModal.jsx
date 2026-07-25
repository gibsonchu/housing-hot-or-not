import { useEffect, useRef, useState } from 'react';
import { matchNeighborhoods } from './surveyBank';

const ink = '#111';
const gray = '#767676';
const line = '#e0e0e0';
const subtle = '#f9f9f9';
const serif = "Georgia,'Times New Roman',Times,serif";
const sans = "'Helvetica Neue',Helvetica,Arial,sans-serif";

const optionBtn = (selected) => ({
  display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
  background: selected ? ink : '#fff', color: selected ? '#fff' : ink,
  border: `1px solid ${selected ? ink : line}`, borderRadius: 4,
  padding: '12px 14px', fontSize: 14, fontFamily: sans, lineHeight: 1.3,
});

export default function SurveyModal({ question, initialValue, onAnswer, onClose }) {
  const [multi, setMulti] = useState([]);
  const [text, setText] = useState(initialValue || '');
  const inputRef = useRef(null);

  useEffect(() => {
    setMulti([]);
    setText(initialValue || '');
  }, [question, initialValue]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  if (!question) return null;
  const q = question;
  const max = q.max || 3;
  const isMulti = q.type === 'Multi-select';

  const toggle = (o) => setMulti((v) => (v.indexOf(o) !== -1 ? v.filter((x) => x !== o) : v.length >= max ? v : [...v, o]));

  const suggestions = q.type === 'Neighborhood' ? matchNeighborhoods(text) : [];
  const label = q.type === 'Pairwise' ? 'Pick one' : isMulti ? `Pick up to ${max}` : q.type === 'Rating Scale' ? 'How important' : '';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(17,17,17,0.32)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="pop"
        role="dialog"
        aria-modal="true"
        aria-label={q.prompt}
        style={{
          background: '#fff', border: `1px solid ${line}`, borderRadius: 6,
          width: 'min(460px,100%)', maxHeight: '86vh', overflowY: 'auto',
          boxShadow: '0 18px 44px rgba(0,0,0,0.16)',
        }}
      >
        <div style={{ padding: '18px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: 10, fontFamily: sans, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: gray }}>{q.category}</span>
          <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: gray, fontSize: 18, lineHeight: 1, padding: 0 }}>&times;</button>
        </div>

        <div style={{ padding: '10px 22px 0' }}>
          <div style={{ fontFamily: serif, fontSize: 21, lineHeight: 1.25, color: ink, textWrap: 'balance' }}>{q.prompt}</div>
          {label && <div style={{ fontSize: 11, color: gray, marginTop: 6, letterSpacing: '0.04em' }}>{label}</div>}
        </div>

        <div style={{ padding: '16px 22px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {q.type === 'Free Text' && (
            <>
              <textarea
                className="field" autoFocus value={text} onChange={(e) => setText(e.target.value)}
                placeholder="A sentence or two is plenty."
                style={{ border: `1px solid ${line}`, borderRadius: 4, padding: '12px 14px', fontSize: 14, fontFamily: sans, minHeight: 96, resize: 'vertical', color: ink }}
              />
              <button
                onClick={() => text.trim() && onAnswer(text.trim())}
                disabled={!text.trim()}
                style={{ ...optionBtn(true), textAlign: 'center', opacity: text.trim() ? 1 : 0.35, fontWeight: 600 }}
              >Submit</button>
            </>
          )}

          {q.type === 'Neighborhood' && (
            <>
              <input
                className="field" ref={inputRef} autoFocus value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && suggestions[0]) onAnswer(suggestions[0]); }}
                placeholder="Start typing — e.g. Bed-Stuy, Astoria, Mott Haven"
                style={{ border: `1px solid ${line}`, borderRadius: 4, padding: '12px 14px', fontSize: 14, fontFamily: sans, color: ink }}
              />
              {suggestions.map((n) => (
                <button key={n} className="btn-soft" onClick={() => onAnswer(n)} style={optionBtn(false)}>{n}</button>
              ))}
              {text.trim() && !suggestions.length && (
                <button className="btn-soft" onClick={() => onAnswer(text.trim())} style={optionBtn(false)}>
                  Use &ldquo;{text.trim()}&rdquo;
                  <span style={{ color: gray, fontSize: 12 }}> — not in our list</span>
                </button>
              )}
              {!text.trim() && (
                <div style={{ fontSize: 12, color: gray, padding: '2px 2px 0' }}>We use this to compare design preferences across neighborhoods.</div>
              )}
            </>
          )}

          {(q.type === 'Single Select' || q.type === 'Pairwise' || q.type === 'Rating Scale') &&
            q.options.map((o) => (
              <button key={o} className="btn-soft" onClick={() => onAnswer(o)} style={optionBtn(false)}>{o}</button>
            ))}

          {isMulti && (
            <>
              {q.options.map((o) => {
                const on = multi.indexOf(o) !== -1;
                return (
                  <button key={o} className="btn-soft" onClick={() => toggle(o)} style={{ ...optionBtn(on), display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 14, height: 14, flex: 'none', borderRadius: 2, border: `1px solid ${on ? '#fff' : line}`, background: on ? '#fff' : subtle }} />
                    {o}
                  </button>
                );
              })}
              <button
                onClick={() => multi.length && onAnswer(multi)}
                disabled={!multi.length}
                style={{ ...optionBtn(true), textAlign: 'center', marginTop: 4, opacity: multi.length ? 1 : 0.35, fontWeight: 600 }}
              >{multi.length ? `Submit ${multi.length} of ${max}` : 'Select at least one'}</button>
            </>
          )}
        </div>

        <div style={{ borderTop: `1px solid ${line}`, padding: '10px 22px', fontSize: 11, color: gray, letterSpacing: '0.03em' }}>
          Click outside or press Esc to skip.
        </div>
      </div>
    </div>
  );
}
