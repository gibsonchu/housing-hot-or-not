// Small shared data-viz primitives, in the same ink-on-white register as the app.

const ink = '#111';
const gray = '#767676';
const line = '#e0e0e0';
const serif = "Georgia,'Times New Roman',Times,serif";
const sans = "'Helvetica Neue',Helvetica,Arial,sans-serif";

export const Section = ({ title, note, children }) => (
  <section style={{ marginTop: 40 }}>
    <h2 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, color: ink, margin: 0 }}>{title}</h2>
    {note && <div style={{ fontSize: 13, color: gray, marginTop: 4, lineHeight: 1.5 }}>{note}</div>}
    <div style={{ marginTop: 16 }}>{children}</div>
  </section>
);

export const Empty = ({ children }) => (
  <div style={{ border: `1px dashed ${line}`, borderRadius: 4, padding: '22px 18px', fontSize: 13, color: gray, textAlign: 'center' }}>{children}</div>
);

/** Horizontal bars. rows: [{ label, value, caption }] — value scaled against max. */
export const Bars = ({ rows, max, format = (v) => v, highlight }) => {
  const top = max != null ? max : Math.max(1, ...rows.map((r) => r.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {rows.map((r) => {
        const on = highlight === r.label;
        return (
          <div key={r.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,1.3fr) 3fr auto', gap: 12, alignItems: 'center', fontSize: 13 }}>
            <span style={{ color: ink, fontWeight: on ? 700 : 400 }}>
              {r.label}
              {r.caption && <span style={{ color: gray, fontWeight: 400, fontSize: 11 }}> {r.caption}</span>}
            </span>
            <span style={{ height: 12, background: '#f2f2f2', borderRadius: 2, overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', width: Math.max(2, (100 * r.value) / top) + '%', background: on ? ink : '#8c8c8c' }} />
            </span>
            <span style={{ fontFamily: sans, fontVariantNumeric: 'tabular-nums', color: gray, fontSize: 12, minWidth: 46, textAlign: 'right' }}>{format(r.value)}</span>
          </div>
        );
      })}
    </div>
  );
};

/** Two-column comparison: your share vs everyone's share, per option. */
export const Compare = ({ rows }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,1.3fr) 3fr 3fr', gap: 12, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: gray }}>
      <span />
      <span>You</span>
      <span>Everyone</span>
    </div>
    {rows.map((r) => (
      <div key={r.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,1.3fr) 3fr 3fr', gap: 12, alignItems: 'center', fontSize: 13 }}>
        <span style={{ color: ink }}>{r.label}</span>
        {[r.you, r.all].map((v, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: 1, height: 12, background: '#f2f2f2', borderRadius: 2, overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', width: Math.max(v > 0 ? 2 : 0, v) + '%', background: i === 0 ? ink : '#c4c4c4' }} />
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: gray, fontSize: 12, width: 34, textAlign: 'right' }}>{v}%</span>
          </span>
        ))}
      </div>
    ))}
  </div>
);

export const Stat = ({ value, label }) => (
  <div style={{ border: `1px solid ${line}`, borderRadius: 4, padding: '16px 18px', flex: '1 1 150px' }}>
    <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 600, color: ink, lineHeight: 1.1 }}>{value}</div>
    <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: gray, marginTop: 4 }}>{label}</div>
  </div>
);
