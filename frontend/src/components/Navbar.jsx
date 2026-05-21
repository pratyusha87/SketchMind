export default function Navbar({ user, page, setPage, onLogout }) {
  const navBtn = (label, key, emoji) => (
    <button onClick={() => setPage(key)} style={{
      background: page === key ? 'rgba(59,130,246,0.15)' : 'none',
      border: page === key ? '1px solid rgba(59,130,246,0.35)' : '1px solid transparent',
      color: page === key ? '#60a5fa' : '#94a3b8',
      borderRadius: 10, padding: '7px 16px',
      cursor: 'pointer', fontSize: 14, fontWeight: 600,
      display: 'flex', alignItems: 'center', gap: 6,
      transition: 'all 0.2s',
    }}>
      <span>{emoji}</span>{label}
    </button>
  );

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 64, background: 'rgba(8,8,15,0.85)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center',
      padding: '0 28px', gap: 16,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginRight: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: 'linear-gradient(135deg,#1e40af,#06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, boxShadow: '0 4px 14px rgba(59,130,246,0.4)',
        }}>✦</div>
        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 18, color: '#f1f5f9', letterSpacing: '-0.3px' }}>
          SketchMind
        </span>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 6 }}>
        {navBtn('Draw', 'draw', '🎨')}
        {navBtn('Gallery', 'gallery', '🖼')}
      </div>

      {/* Right side */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, padding: '6px 14px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'linear-gradient(135deg,#1e40af,#06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff',
          }}>
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 500 }}>{user?.name}</span>
        </div>
        <button onClick={onLogout} style={{
          background: 'none', border: '1px solid rgba(255,255,255,0.08)',
          color: '#64748b', borderRadius: 10, padding: '6px 14px',
          cursor: 'pointer', fontSize: 13, transition: 'all 0.2s',
        }}>Sign out</button>
      </div>
    </nav>
  );
}
