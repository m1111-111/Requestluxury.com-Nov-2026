'use client';

import { useEffect, useState } from 'react';

/** The current time, ticking while `active`. Null until mounted so server and client markup match. */
export function useNow(active = true, intervalMs = 1000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [active, intervalMs]);
  return now;
}
