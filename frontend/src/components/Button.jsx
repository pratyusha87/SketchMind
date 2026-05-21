export default function Button({ children, onClick, loading, disabled, variant = 'primary', style: s = {}, type = 'button' }) {
  const base = {
    width: '100%', padding: '14px 24px', borderRadius: 13,
    fontSize: 15, fontWeight: 600, cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1, transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    letterSpacing: '0.01em', border: 'none',
  };
  const variants = {
    primary: {
      background: 'linear-gradient(135deg,#1e40af,#3b82f6,#06b6d4)',
      color: '#fff', boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
    },
    ghost: {
      background: 'rgba(255,255,255,0.04)',
      color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)',
    },
    danger: {
      background: 'rgba(239,68,68,0.1)',
      color: '#f87171', border: '1px solid rgba(239,68,68,0.3)',
    },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading}
      style={{ ...base, ...variants[variant], ...s }}>
      {loading
        ? <span style={{ width:18, height:18, border:'2px solid rgba(255,255,255,0.25)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} />
        : children}
    </button>
  );
}
