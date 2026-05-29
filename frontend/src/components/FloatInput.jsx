import { useState } from 'react';

export default function FloatInput({
  label, type = 'text', value, onChange,
  error, autoComplete, disabled
}) {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const isPass  = type === 'password';
  const hasValue = value !== undefined && value !== null && String(value).length > 0;
  const lifted   = focused || hasValue;

  return (
    <div style={{ marginBottom: 18 }}>

      {/* Label sits ABOVE the box when lifted */}
      <label style={{
        display: 'block',
        marginBottom: lifted ? 5 : 0,
        fontSize: lifted ? 11 : 0,
        fontWeight: 700,
        color: error ? '#f87171' : '#60a5fa',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        transition: 'all 0.15s',
        height: lifted ? 'auto' : 0,
        overflow: 'hidden',
        opacity: lifted ? 1 : 0,
      }}>
        {label}
      </label>

      <div style={{
        position: 'relative',
        background: focused ? 'rgba(96,165,250,0.06)' : 'rgba(255,255,255,0.03)',
        border: `1.5px solid ${
          error   ? '#f87171' :
          focused ? 'rgba(96,165,250,0.6)' :
                    'rgba(255,255,255,0.1)'
        }`,
        borderRadius: 13,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: focused ? '0 0 0 3px rgba(96,165,250,0.1)' : 'none',
      }}>

        {/* Placeholder shown only when empty AND not focused */}
        {!lifted && (
          <span style={{
            position: 'absolute',
            left: 15,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#64748b',
            fontSize: 15,
            pointerEvents: 'none',
            userSelect: 'none',
          }}>
            {label}
          </span>
        )}

        <input
          type={isPass && showPass ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          disabled={disabled}
          placeholder=""
          style={{
            width: '100%',
            padding: '16px 44px 16px 15px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#f1f5f9',
            fontSize: 15,
            boxSizing: 'border-box',
          }}
        />

        {isPass && (
          <button
            type="button"
            onClick={() => setShowPass(v => !v)}
            style={{
              position: 'absolute', right: 13,
              top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none',
              cursor: 'pointer', color: '#64748b', fontSize: 17, padding: 4,
            }}
          >
            {showPass ? '🙈' : '👁'}
          </button>
        )}
      </div>

      {error && (
        <p style={{ margin: '5px 0 0 2px', fontSize: 12, color: '#f87171' }}>
          {error}
        </p>
      )}
    </div>
  );
}
