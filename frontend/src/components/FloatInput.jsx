import { useState } from 'react';

export default function FloatInput({ label, type = 'text', value, onChange, error, autoComplete, disabled }) {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const isPass  = type === 'password';
  const active  = focused || value;

  return (
    <div style={{ position: 'relative', marginBottom: 18 }}>
      <div style={{
        position: 'relative',
        background: focused ? 'rgba(96,165,250,0.06)' : 'rgba(255,255,255,0.03)',
        border: `1.5px solid ${error ? '#f87171' : focused ? 'rgba(96,165,250,0.6)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 13, transition: 'all 0.25s',
        boxShadow: focused ? '0 0 0 3px rgba(96,165,250,0.1)' : 'none',
      }}>
        <span style={{
          position: 'absolute', left: 15, top: active ? 8 : '50%',
          transform: active ? 'none' : 'translateY(-50%)',
          fontSize: active ? 10 : 15,
          color: active ? (error ? '#f87171' : '#60a5fa') : '#64748b',
          fontWeight: active ? 700 : 400,
          letterSpacing: active ? '0.08em' : '0',
          textTransform: active ? 'uppercase' : 'none',
          transition: 'all 0.2s', pointerEvents: 'none', zIndex: 1,
        }}>{label}</span>
        <input
          type={isPass && showPass ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          disabled={disabled}
          style={{
            width: '100%',
            padding: active ? '24px 44px 10px 15px' : '18px 44px 18px 15px',
            background: 'transparent', border: 'none', outline: 'none',
            color: '#f1f5f9', fontSize: 15, transition: 'padding 0.2s', boxSizing: 'border-box',
          }}
        />
        {isPass && (
          <button type="button" onClick={() => setShowPass(v => !v)} style={{
            position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 17, padding: 4,
          }}>{showPass ? '🙈' : '👁'}</button>
        )}
      </div>
      {error && <p style={{ margin: '5px 0 0 4px', fontSize: 12, color: '#f87171' }}>{error}</p>}
    </div>
  );
}
