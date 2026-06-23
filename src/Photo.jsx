export default function Photo({ photo, style }) {
  const p = (photo || '').trim();
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#dcefe2', overflow: 'hidden', ...style }}>
      {p ? (
        <img src={p} alt="building" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(135deg,#cfe7d8 0,#cfe7d8 14px,#dcefe2 14px,#dcefe2 28px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{
            fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif", fontWeight: 600, fontSize: 11,
            letterSpacing: '0.22em', color: '#3e7a5b', border: '1.5px solid #8fc3a6', padding: '5px 11px',
            background: 'rgba(255,255,255,0.7)', borderRadius: 999,
          }}>PHOTO</span>
        </div>
      )}
    </div>
  );
}
