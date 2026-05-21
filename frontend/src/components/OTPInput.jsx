import { useRef } from 'react';

export default function OTPInput({ value, onChange, disabled }) {
  const inputs = useRef([]);
  const digits  = (value || '      ').slice(0, 6).split('');

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const arr = [...digits];
      if (arr[i]?.trim()) { arr[i] = ' '; onChange(arr.join('')); }
      else if (i > 0)     { arr[i-1] = ' '; onChange(arr.join('')); inputs.current[i-1]?.focus(); }
    }
  };

  const handleChange = (i, e) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    const arr = [...digits];
    arr[i] = val || ' ';
    onChange(arr.join(''));
    if (val && i < 5) inputs.current[i+1]?.focus();
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text) { onChange(text.padEnd(6, ' ')); inputs.current[Math.min(text.length, 5)]?.focus(); }
    e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }} onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input key={i} ref={el => inputs.current[i] = el}
          type="text" inputMode="numeric" maxLength={1}
          value={digits[i]?.trim() || ''}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)}
          onFocus={e => e.target.select()}
          disabled={disabled}
          style={{
            width: 48, height: 58, textAlign: 'center',
            fontSize: 24, fontWeight: 700, fontFamily: "'Space Mono',monospace",
            background: digits[i]?.trim() ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.04)',
            border: `2px solid ${digits[i]?.trim() ? 'rgba(96,165,250,0.7)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 12, color: '#60a5fa', outline: 'none',
            transition: 'all 0.2s', caretColor: '#60a5fa',
            boxShadow: digits[i]?.trim() ? '0 0 16px rgba(96,165,250,0.2)' : 'none',
          }}
        />
      ))}
    </div>
  );
}
