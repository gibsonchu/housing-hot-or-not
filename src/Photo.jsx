export default function Photo({ photo, style }) {
  const p = (photo || '').trim();
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#e9e9e9', overflow: 'hidden', ...style }}>
      {p ? (
        <img src={p} alt="building" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(135deg,#d6d6d6 0,#d6d6d6 14px,#e6e6e6 14px,#e6e6e6 28px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{
            fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif", fontWeight: 700, fontSize: 11,
            letterSpacing: '0.25em', color: '#777', border: '1.5px solid #9a9a9a', padding: '5px 11px', background: '#f3f3f3'
          }}>[ PHOTO ]</span>
        </div>
      )}
    </div>
  );
}
