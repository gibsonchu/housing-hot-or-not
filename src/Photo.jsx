export default function Photo({ photo, style }) {
  const p = (photo || '').trim();
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#f0f0f0', overflow: 'hidden', ...style }}>
      {p ? (
        <img src={p} alt="building" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(135deg,#e8e8e8 0,#e8e8e8 14px,#f0f0f0 14px,#f0f0f0 28px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{
            fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif", fontWeight: 600, fontSize: 10,
            letterSpacing: '0.22em', textTransform: 'uppercase', color: '#999', border: '1px solid #ccc',
            padding: '4px 10px', background: 'rgba(255,255,255,0.7)',
          }}>Photo</span>
        </div>
      )}
    </div>
  );
}
