import { useEffect } from 'react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const cfg = {
    success: { bg: '#052e16', border: '#4ade80', icon: '✓', color: '#4ade80' },
    error:   { bg: '#3b0000', border: '#f87171', icon: '✕', color: '#f87171' },
    info:    { bg: '#0c1a3b', border: '#60a5fa', icon: 'ℹ', color: '#60a5fa' },
    warning: { bg: '#1c1200', border: '#f59e0b', icon: '⚠', color: '#f59e0b' },
  }[toast.type] || { bg: '#0c1a3b', border: '#60a5fa', icon: 'ℹ', color: '#60a5fa' };

  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 9999,
      background: cfg.bg, border: `1px solid ${cfg.border}40`,
      borderRadius: 14, padding: '14px 20px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: `0 8px 32px ${cfg.border}20`, maxWidth: 380,
      animation: 'slideIn 0.3s ease',
    }}>
      <span style={{ fontSize: 17, color: cfg.color, fontWeight: 700 }}>{cfg.icon}</span>
      <span style={{ color: cfg.color, fontSize: 14, lineHeight: 1.5, flex: 1 }}>{toast.message}</span>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', color: cfg.color,
        cursor: 'pointer', fontSize: 16, opacity: 0.6, padding: '0 0 0 8px',
      }}>✕</button>
    </div>
  );
}
