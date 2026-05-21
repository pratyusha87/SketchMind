import { useState, useEffect, useCallback } from 'react';

export function useTimer(seconds) {
  const [left, setLeft]     = useState(seconds);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!active || left <= 0) { setActive(false); return; }
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, active]);

  const restart = useCallback(() => { setLeft(seconds); setActive(true); }, [seconds]);
  return { left, expired: !active || left <= 0, restart };
}
