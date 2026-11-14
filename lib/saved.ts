'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'rl_saved';
const EVENT = 'rl:saved-changed';

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string').slice(0, 60) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids.slice(0, 60)));
  } catch {
    // Storage unavailable: saved items last for this page only.
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Saved listings, kept in this browser. No account is needed to keep a shortlist. */
export function useSaved() {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setIds(read());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const current = read();
    write(current.includes(id) ? current.filter((item) => item !== id) : [id, ...current]);
  }, []);

  return { ids, ready, toggle, isSaved: (id: string) => ids.includes(id) };
}
