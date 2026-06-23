export default function Photo({ photo, style }) {
  const p = (photo || '').trim();
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#eeeefb', overflow: 'hidden', ...style }}>
      {p ? (
        <img src={p} alt="building" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(135deg,#dcdcf3 0,#dcdcf3 14px,#eeeefb 14px,#eeeefb 28px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{
            fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif", fontWeight: 600, fontSize: 11,
            letterSpacing: '0.22em', color: '#070061', border: '1.5px solid #a9a9d4', padding: '5px 11px',
            background: 'rgba(255,255,255,0.7)', borderRadius: 999,
          }}>PHOTO</span>
        </div>
      )}
    </div>
  );
}
